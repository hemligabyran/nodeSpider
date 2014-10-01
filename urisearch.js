var request = require('request'),
    cheerio = require('cheerio'),
    url     = require('url'),
    path    = require('path');

var protocol  = 'http://',
    domain    = 'larvit.se',
    searchStr = 'Linux';

var uris = {'/': {'visited': false, 'body': undefined, 'stringFound': undefined, 'error': undefined, 'statusCode': undefined}};

function investigateUris() {
	for (var uri in uris) {
		var uri = uri;

		if (uris[uri].visited === false && uri) {
			var fullUri = '';
			if (uri == '/') fullUri = protocol + domain + uri;
			else            fullUri = protocol + domain + '/' + uri;

			uris[uri].visited = true; // Must be done before the request, so no other request is tried at the same time for the same URI

			request(fullUri, function(error, response, body) {
				var uri = response.req.path;
				if (uri[0] == '/' && uri != '/')
					uri = uri.substr(1);

				if ( ! error && response != undefined && typeof response === 'Object')
					uris[uri].statusCode = response.statusCode;

				if ( ! error && response.statusCode == 200) {
					//uris[uri].body = body; // becomes to large to often (binary images etc)

					if (body.indexOf(searchStr) > 0)
						uris[uri].stringFound = true;
					else
						uris[uri].stringFound = false;

					var $          = cheerio.load(body);
					var links      = $('[href], [src]');
					var runAgain   = false;

					$(links).each(function(i, link) {
						if ($(link).attr('href'))
							var href = $(link).attr('href');
						else if ($(link).attr('src'))
							var href = $(link).attr('src');

						if (typeof href == 'string' && href.length) {
							var parsedHref = url.parse(href);
							var uriToAdd   = '';

							if (( ! parsedHref.host || parsedHref.host === domain) && parsedHref.path) {

								// We need to resolve the path, if it is for example relative
								var resolvedPath = path.resolve(path.dirname(response.req.path) + '/', parsedHref.path);

								// If the first character in the URI is a slash, remove it (we will add it later to all URIs)
								if (resolvedPath[0] == '/')
									resolvedPath = resolvedPath.substr(1);

								if (parsedHref.query)
									uriToAdd = resolvedPath + '?' + parsedHref.query;
								else
									uriToAdd = resolvedPath;

								if ( ! uris[uriToAdd]) {
									uris[uriToAdd] = {'visited': false, 'body': undefined, 'stringFound': false, 'error': undefined, 'statusCode': undefined};
									runAgain       = true;
								}
							}
						}
					});

					if (runAgain) {
						investigateUris();
					} else {
						// Check if we should print the result
						var printResult = true;
						for (var uri in uris) {
							if (uris[uri].stringFound === undefined) {
								printResult = false;
								break;
							}
						}
						if (printResult) {
							console.log('All URIs searched:');
							console.log('==================');
							for (var uri in uris)
								console.log(uri);

							console.log('\nURIs containing the search string:');
							for (var uri in uris) {
								if (uris[uri].stringFound)
									console.log(uri);
							}
						}
					}

				} else {
					uris[uri].error = error;
				}
			});
		}
	}
}
investigateUris();
