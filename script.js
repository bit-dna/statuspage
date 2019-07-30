$(document).ready(function() {
	var config = {
		uptimerobot: {
			api_keys: [
				"m783128505-fd9d5432f1ad9ce97525ee17",
				"m783128519-b856605bb347d40c8c7395b9",
				"m783128516-9e7387c3ffa9ed159773d19d",
				"m783183497-5dd7a98e1e15d237020f0a20",
				"m783185922-299c1220b95555a1286ae0d7"
			],
			logs: 1
		},
		github: {
			org: 'bit-dna',
			repo: 'statuspage'
		}
	};

	var status_text = {
		'operational': 'operational',
		'investigating': 'investigating',
		'major outage': 'outage',
		'degraded performance': 'degraded',
	};

	var monitors = config.uptimerobot.api_keys;
	for( var i in monitors ){
		var api_key = monitors[i];
		$.post('https://api.uptimerobot.com/v2/getMonitors', {
			"api_key": api_key,
			"format": "json",
			"logs": config.uptimerobot.logs,
		}, function(response) {
			status( response );
		}, 'json');
	}

	function status(data) {
		data.monitors = data.monitors.map(function(check) {
			check.class = check.status === 2 ? 'label-success' : 'label-danger';
			check.text = check.status === 2 ? 'operational' : 'major outage';
			if( check.status !== 2 && !check.lasterrortime ){
				check.lasterrortime = Date.now();
			}
			if (check.status === 2 && Date.now() - (check.lasterrortime * 1000) <= 86400000) {
				check.class = 'label-warning';
				check.text = 'degraded performance';
			}
			return check;
		});

		var status = data.monitors.reduce(function(status, check) {
			return check.status !== 2 ? 'danger' : 'operational';
		}, 'operational');

		if (!$('#panel').data('incident')) {
			$('#panel').attr('class', (status === 'operational' ? 'panel-info' : 'panel-warning') );
			$('#paneltitle').html(status === 'operational' ? 'All systems are operational.' : 'One or more systems inoperative');
		}
		data.monitors.forEach(function(item) {
			var name = item.friendly_name;
			var clas = item.class;
			var text = item.text;
			$('#services').append('<div class="list-group-item">'+
				'<span class="badge '+ clas + '">' + text + '</span>' +
				'<h4 class="list-group-item-heading">' + name + '</h4>' +
				'</div>');
		});
	};

	$.getJSON( 'https://api.github.com/repos/' + config.github.org + '/' + config.github.repo + '/issues?state=all' ).done(message);

	function message(issues) {
		issues.forEach(function(issue) {
			var status = issue.labels.reduce(function(status, label) {
				if (/^status:/.test(label.name)) {
					return label.name.replace('status:', '');
				} else {
					return status;
				}
			}, 'operational');

			var systems = issue.labels.filter(function(label) {
				return /^system:/.test(label.name);
			}).map(function(label) {
				return label.name.replace('system:', '')
			});

			if (issue.state === 'open') {
				$('#panel').data('incident', 'true');
				$('#panel').attr('class', (status === 'operational' ? 'panel-info' : 'panel-warn') );
				$('#paneltitle').html('<a href="#incidents">' + issue.title + '</a>');
			}

			var html = '<article class="timeline-entry">\n';
			html += '<div class="timeline-entry-inner">\n';

			if (issue.state === 'closed') {
				html += '<div class="timeline-icon bg-success"><i class="entypo-feather"></i></div>';
			} else {
				html += '<div class="timeline-icon bg-secondary"><i class="entypo-feather"></i></div>';
			}

			html += '<div class="timeline-label">\n';
			html += '<span class="date">' + datetime(issue.created_at) + '</span>\n';

			if (issue.state === 'closed') {
				html += '<span class="badge label-success pull-right">closed</span>';
			} else {
				html += '<span class="badge ' + (status === 'operational' ? 'label-success' : 'label-warn') + ' pull-right">open</span>\n';
			}

			for (var i = 0; i < systems.length; i++) {
				html += '<span class="badge system pull-right">' + systems[i] + '</span>';
			}

			html += '<h2>' + issue.title + '</h2>\n';
			html += '<hr>\n';
			html += '<p>' + issue.body + '</p>\n';

			if (issue.state === 'closed') {
				html += '<p><em>Updated ' + datetime(issue.closed_at) + '<br/>';
				html += 'The system is back in normal operation.</p>';
			}
			html += '</div>';
			html += '</div>';
			html += '</article>';
			$('#incidents').append(html);
		});

		function datetime(string) {
			var datetime = string.split('T');
			var date = datetime[0];
			var time = datetime[1].replace('Z', '');
			return date + ' ' + time;
		};
	};
});
