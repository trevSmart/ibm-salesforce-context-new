import config from '../config.js';

let tlsRelaxed = false;

function relaxTlsIfNeeded() {
	if (tlsRelaxed) {
		return;
	}

	process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
	tlsRelaxed = true;
}

export function applyFetchSslOptions(url, options = {}) {
	if (typeof url !== 'string' || !url.startsWith('https://')) {
		return options;
	}

	if (config.strictSsl === false) {
		relaxTlsIfNeeded();
	}

	return options;
}
