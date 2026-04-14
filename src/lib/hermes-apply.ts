import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parse, stringify } from "yaml";

const execFileAsync = promisify(execFile);

type JsonRecord = Record<string, unknown>;

export type HermesApplyInput = {
  configPatch: JsonRecord;
  soulMarkdown: string;
};

export type HermesApplyResult = {
  ok: boolean;
  backupDir: string;
  configPath: string;
  soulPath: string;
  warnings: string[];
  checkMessage: string;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isRecord(base) || !isRecord(patch)) {
    return patch;
  }

  const merged: JsonRecord = { ...base };
  Object.keys(patch).forEach((key) => {
    const baseValue = merged[key];
    const patchValue = patch[key];

    if (isRecord(baseValue) && isRecord(patchValue)) {
      merged[key] = deepMerge(baseValue, patchValue);
      return;
    }

    merged[key] = patchValue;
  });

  return merged;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readYamlObject(path: string): Promise<JsonRecord> {
  const exists = await fileExists(path);
  if (!exists) {
    return {};
  }

  const raw = await readFile(path, "utf-8");
  if (!raw.trim()) {
    return {};
  }

  const parsed = parse(raw) as unknown;
  if (!isRecord(parsed)) {
    return {};
  }

  return parsed;
}

async function tryHermesConfigCheck(hermesHome: string): Promise<{ passed: boolean; message: string; skipped: boolean }> {
  try {
    const { stdout, stderr } = await execFileAsync("hermes", ["config", "check"], {
      cwd: hermesHome,
      timeout: 20_000,
      env: process.env,
    });

    const message = [stdout, stderr].filter(Boolean).join("\n").trim() || "`hermes config check` passed.";
    return { passed: true, message, skipped: false };
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code === "ENOENT") {
      return {
        passed: true,
        skipped: true,
        message: "Hermes CLI not found. Skipped `hermes config check`.",
      };
    }

    const stderr = "stderr" in (error as object) ? String((error as { stderr?: unknown }).stderr ?? "") : "";
    const stdout = "stdout" in (error as object) ? String((error as { stdout?: unknown }).stdout ?? "") : "";
    const message = [stderr, stdout].filter(Boolean).join("\n").trim() || "`hermes config check` failed.";
    return { passed: false, skipped: false, message };
  }
}

async function restoreFile({
  existedBefore,
  backupPath,
  targetPath,
}: {
  existedBefore: boolean;
  backupPath: string;
  targetPath: string;
}): Promise<void> {
  if (existedBefore) {
    await copyFile(backupPath, targetPath);
    return;
  }

  await rm(targetPath, { force: true });
}

export async function applyDeckToHermes(input: HermesApplyInput): Promise<HermesApplyResult> {
  const hermesHome = process.env.HERMES_HOME ?? join(homedir(), ".hermes");
  const configPath = join(hermesHome, "config.yaml");
  const soulPath = join(hermesHome, "SOUL.md");

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(hermesHome, "backups", timestamp);
  await mkdir(backupDir, { recursive: true });

  const backupConfigPath = join(backupDir, "config.yaml.bak");
  const backupSoulPath = join(backupDir, "SOUL.md.bak");

  const configExistedBefore = await fileExists(configPath);
  const soulExistedBefore = await fileExists(soulPath);

  if (configExistedBefore) {
    await copyFile(configPath, backupConfigPath);
  }

  if (soulExistedBefore) {
    await copyFile(soulPath, backupSoulPath);
  }

  const warnings: string[] = [];

  try {
    const existingConfig = await readYamlObject(configPath);
    const mergedConfig = deepMerge(existingConfig, input.configPatch);

    await mkdir(hermesHome, { recursive: true });
    await writeFile(configPath, `${stringify(mergedConfig)}\n`, "utf-8");
    await writeFile(soulPath, `${input.soulMarkdown.trimEnd()}\n`, "utf-8");

    const checkResult = await tryHermesConfigCheck(hermesHome);
    if (!checkResult.passed) {
      await restoreFile({
        existedBefore: configExistedBefore,
        backupPath: backupConfigPath,
        targetPath: configPath,
      });
      await restoreFile({
        existedBefore: soulExistedBefore,
        backupPath: backupSoulPath,
        targetPath: soulPath,
      });
      throw new Error(checkResult.message);
    }

    if (checkResult.skipped) {
      warnings.push(checkResult.message);
    }

    return {
      ok: true,
      backupDir,
      configPath,
      soulPath,
      warnings,
      checkMessage: checkResult.message,
    };
  } catch (error) {
    await restoreFile({
      existedBefore: configExistedBefore,
      backupPath: backupConfigPath,
      targetPath: configPath,
    });
    await restoreFile({
      existedBefore: soulExistedBefore,
      backupPath: backupSoulPath,
      targetPath: soulPath,
    });

    throw error;
  }
}
