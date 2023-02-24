



def html_to_raw_text(html: str):
		""" Convert string with html tags to unformatted raw text (removing all tags) """
		return html.replace('&nbsp;', ' ') \
				.replace("&Auml;", 'Ä') \
				.replace('&auml;', 'ä') \
				.replace('&Ouml;', 'Ö') \
				.replace('&ouml;', 'ö') \
				.replace('&Uuml;', 'Ü') \
				.replace('&uuml;', 'ü') \
				.replace('&szlig;', 'ß') \
				.replace('&euro;', '€') \
				.replace('&bdquo;', '"') \
				.replace('&ldquo;', '"') \
				.replace('&sbquo;', "'") \
				.replace('&lsquo;', "'") \
				.replace('\n', "")
