<?php
/**
 * ISO country codes and label helpers (reusable across theme).
 *
 * Labels live in languages/ui-de.php as country:{code} and country-en:{code}.
 *
 * @package MFKA-AT-2026
 */

/**
 * Valid ISO 3166-1 alpha-2 country codes used in ACF country_select.
 *
 * @return string[]
 */
function mfka_country_codes(): array {
	return array(
		'af',
		'eg',
		'dz',
		'ar',
		'au',
		'by',
		'be',
		'ba',
		'br',
		'cl',
		'dk',
		'de',
		'ec',
		'sv',
		'er',
		'ee',
		'fi',
		'fr',
		'gh',
		'gr',
		'gb',
		'gt',
		'ht',
		'hk',
		'in',
		'id',
		'ir',
		'is',
		'il',
		'it',
		'jp',
		'ca',
		'co',
		'xk',
		'hr',
		'cu',
		'mg',
		'my',
		'mt',
		'mu',
		'mk',
		'mx',
		'np',
		'nz',
		'nl',
		'no',
		'at',
		'pe',
		'ph',
		'pl',
		'pt',
		'ro',
		'ru',
		'se',
		'rs',
		'sg',
		'sk',
		'si',
		'es',
		'za',
		'kr',
		'tw',
		'th',
		'cz',
		'tn',
		'ug',
		'ua',
		'hu',
		'us',
		've',
		'cn',
	);
}

/**
 * Normalize and validate a country code.
 *
 * @param string $code Raw country code.
 * @return string Lowercase code, or empty string if invalid.
 */
function mfka_normalize_country_code( string $code ): string {
	$code = strtolower( trim( $code ) );

	if ( '' === $code || ! in_array( $code, mfka_country_codes(), true ) ) {
		return '';
	}

	return $code;
}

/**
 * Whether a country code is valid.
 *
 * @param string $code Country code.
 * @return bool
 */
function mfka_is_valid_country_code( string $code ): bool {
	return '' !== mfka_normalize_country_code( $code );
}

/**
 * German country label for frontend output.
 *
 * @param string $code ISO country code.
 * @return string
 */
function mfka_country_label( string $code ): string {
	$code = mfka_normalize_country_code( $code );

	if ( '' === $code ) {
		return '';
	}

	$key        = 'country:' . $code;
	$translated = mfka_ui( $key );

	return $translated !== $key ? $translated : '';
}

/**
 * English country label (for future EN frontend).
 *
 * @param string $code ISO country code.
 * @return string
 */
function mfka_country_label_en( string $code ): string {
	$code = mfka_normalize_country_code( $code );

	if ( '' === $code ) {
		return '';
	}

	$key        = 'country-en:' . $code;
	$translated = mfka_ui( $key );

	return $translated !== $key ? $translated : '';
}

/**
 * Resolve a legacy free-text country value to an ISO code.
 *
 * Matches stored country_de / country_en text against known labels.
 *
 * @param string $value Legacy country text.
 * @return string ISO code or empty string.
 */
function mfka_country_code_from_legacy_value( string $value ): string {
	$value = trim( $value );

	if ( '' === $value ) {
		return '';
	}

	foreach ( mfka_country_codes() as $code ) {
		if (
			$value === mfka_country_label( $code )
			|| $value === mfka_country_label_en( $code )
		) {
			return $code;
		}
	}

	return '';
}

/**
 * Legacy meta values that should match a country code filter.
 *
 * @param string $code ISO country code.
 * @return string[]
 */
function mfka_country_legacy_meta_values( string $code ): array {
	$code = mfka_normalize_country_code( $code );

	if ( '' === $code ) {
		return array();
	}

	$values = array_filter(
		array(
			mfka_country_label( $code ),
			mfka_country_label_en( $code ),
		)
	);

	return array_values( array_unique( $values ) );
}
