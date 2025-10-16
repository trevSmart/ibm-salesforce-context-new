import fs from 'node:fs';
import path from 'node:path';
import config from '../config.js';
import {createModuleLogger} from './logger.js';

const logger = createModuleLogger(import.meta.url);

// Get temp directory configuration
function getConfig() {
	const defaults = {
		baseSubdir: 'tmp',
		retentionDays: 7
		// Scheduling disabled by design; cleanup runs opportunistically on writes
	};
	return {...defaults, ...(config?.tempDir || {})};
}

// Get the base temporary directory path
export function getBaseTmpDir() {
	const {baseSubdir} = getConfig();
	return path.join(process.cwd(), baseSubdir);
}

// Ensure the base temporary directory exists
export function ensureBaseTmpDir() {
	const tmpDir = getBaseTmpDir();
	try {
		if (!fs.existsSync(tmpDir)) {
			fs.mkdirSync(tmpDir, {recursive: true});
			logger.debug(`Created tmp directory: ${tmpDir}`);
		}
	} catch (error) {
		logger.error(error, `Failed to ensure tmp directory: ${tmpDir}`);
	}
	return tmpDir;
}

// Clean up obsolete temporary files
export function cleanupObsoleteTempFiles(options = {}) {
	const baseDir = options.baseDir || ensureBaseTmpDir();
	const retentionDays = options.retentionDays || getConfig().retentionDays;
	const maxAgeMs = Math.max(0, Number(retentionDays)) * 24 * 60 * 60 * 1000;

	if (!(maxAgeMs && fs.existsSync(baseDir))) {
		return {deleted: 0, inspected: 0, deletedDirs: 0, baseDir};
	}

	let deleted = 0;
	let inspected = 0;
	let deletedDirs = 0;
	const emptyDirsToCheck = [];

	try {
		const entries = fs.readdirSync(baseDir);
		const now = Date.now();

		for (const entry of entries) {
			// Skip dotfiles or known keep files
			if (entry === '.gitkeep' || entry.startsWith('.')) {
				continue;
			}

			const fullPath = path.join(baseDir, entry);
			try {
				const stats = fs.statSync(fullPath);
				inspected++;

				if (stats.isFile()) {
					// Handle files
					const ageMs = now - stats.mtimeMs;
					if (ageMs > maxAgeMs) {
						fs.unlinkSync(fullPath);
						deleted++;
					}
				} else if (stats.isDirectory()) {
					// Track directories to check for emptiness later
					emptyDirsToCheck.push(fullPath);
				}
			} catch (err) {
				logger.debug(err, `Skipping ${fullPath} during cleanup`);
			}
		}

		// After deleting files, check if any directories are now empty
		for (const dirPath of emptyDirsToCheck) {
			try {
				const dirEntries = fs.readdirSync(dirPath);
				// Filter out dotfiles when checking if directory is empty
				const nonDotFiles = dirEntries.filter((entry) => !entry.startsWith('.'));

				if (nonDotFiles.length === 0) {
					fs.rmSync(dirPath, {recursive: true, force: true});
					deletedDirs++;
					logger.debug(`Removed empty directory: ${dirPath}`);
				}
			} catch (err) {
				logger.debug(err, `Error checking/removing directory ${dirPath}`);
			}
		}
	} catch (error) {
		logger.error(error, 'Temp cleanup failed');
	}

	if (deleted > 0 || deletedDirs > 0) {
		const fileMsg = deleted > 0 ? `${deleted} obsolete file(s)` : '';
		const dirMsg = deletedDirs > 0 ? `${deletedDirs} empty director${deletedDirs > 1 ? 'ies' : 'y'}` : '';
		const parts = [fileMsg, dirMsg].filter(Boolean);
		logger.info(`Temp cleanup: deleted ${parts.join(' and ')} from ${baseDir}`);
	} else {
		logger.debug(`Temp cleanup: nothing to delete in ${baseDir}`);
	}

	return {deleted, inspected, deletedDirs, baseDir};
}

// Scheduling intentionally omitted; cleanup is performed on-demand at write time
