const rp = require('request-promise-native');
const argv = require('minimist')(process.argv.slice(2));
const moment = require('moment');
require('moment-recur');

const API_URL = 'https://api.github.com/';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/';

const {
	o: owner,
	r: repo,
	a: access_token
} = argv;

if (!owner || !repo || !access_token) {
	console.log('Usage: \nnode index.js -a GITHUB_API_TOKEN -o REPO_OWNER_NAME -r REPO_NAME');
	return;
}

const defaultOptions = {
	qs: {
		access_token
	},
	headers: {
		'User-Agent': 'Github Issue Webtask'
	},
	json: true
};

const templateOptions = {
	method: 'GET',
	uri: `${GITHUB_RAW_URL}${owner}/${repo}/master/ISSUE_TEMPLATE.md`,
};
rp(Object.assign({}, defaultOptions, templateOptions))
	.then(function (issueTemplate) {
		const title = generateIssueTitle();
		const issueOptions = {
			method: 'POST',
			uri: `${API_URL}repos/${owner}/${repo}/issues`,
			body: {
				title,
				body: issueTemplate,
				labels: ['MEETING']
			},
		};
		rp(Object.assign({}, defaultOptions, issueOptions))
			.then(function (response) {
				console.log('Issue created successfully.');
			})
			.catch((err) => {
				console.log('An error occurred while creating the Github issue.', err);
			});
	})
	.catch(function (err) {
		if (err.statusCode === 404) {
			console.log('Unable to find ISSUE_TEMPLATE.md in that repository.');
		} else {
			console.log('Unknown error.');
		}
	});

function getNextMeeting() {
	return moment().recur().every("Tuesday").daysOfWeek()
		.every(2).weeksOfMonthByDay().next(1);
}

function generateIssueTitle() {
	const date = getNextMeeting();
	return `${(date[0].format('MMM Do')).toUpperCase()} at 6:00pm`;
}
