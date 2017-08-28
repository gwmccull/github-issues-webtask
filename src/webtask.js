"use latest";

const rp = require('request-promise-native');
const moment = require('moment');
require('moment-recur');

const API_URL = 'https://api.github.com/';
const GITHUB_RAW_URL = 'https://raw.githubusercontent.com/';
const DAYS_OF_WEEK = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

module.exports = function (context, cb) {
	const {
		o: owner,
		r: repo,
		d: dayOfWeek,
		w: weekOfMonth
	} = context.data;
	const {
		github_token,
	} = context.secrets;

	let msg;
	let err;

	if (!owner || !repo || !dayOfWeek || !weekOfMonth) {
		err = 'Usage: curl <WEBTASK_URL>?o=REPO_OWNER_NAME&r=REPO_NAME&d=DAY_OF_WEEK&w=WEEK_OF_MONTH';
		return cb(err);
	}

	if (!github_token) {
		err= 'Github token not found in secrets. Did you set up the task correctly? The secret must be called `github_token`'
		return cb(err);
	}

	if (!isDayValid(dayOfWeek)) {
		err = `Invalid day. Please use one of following: ${DAYS_OF_WEEK.join(', ')}`;
		return cb(err);
	}

	const defaultOptions = {
		qs: {
			access_token: github_token
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
		.then((issueTemplate) => {
			const title = generateIssueTitle(dayOfWeek, weekOfMonth);
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
				.then((response) => {
					msg = 'Issue created successfully.';
					return cb(null, msg);
				})
				.catch((err) => {
					err = 'An error occurred while creating the Github issue.';
					return cb(err);
				});
		})
		.catch(function (err) {
			if (err.statusCode === 404) {
				err = 'Unable to find ISSUE_TEMPLATE.md in that repository.';
			} else {
				err = 'Unknown error.';
			}
			return cb(err);
		});
};

function getNextMeeting(dayOfWeek, weekOfMonth) {
	const date = moment();
	const firstOfNextMonth = date.month(date.month() + 1).date(1);
	return moment(firstOfNextMonth).recur().every(dayOfWeek).daysOfWeek()
		.every(weekOfMonth - 1).weeksOfMonthByDay().next(1);
}

function generateIssueTitle(dayOfWeek, weekOfMonth) {
	const date = getNextMeeting(dayOfWeek, weekOfMonth);
	return `${(date[0].format('MMM')).toUpperCase()} ${date[0].format('Do')} at 6:00pm`;
}

function isDayValid(dayOfWeek = '') {
	return DAYS_OF_WEEK.findIndex((day) => day === dayOfWeek.toUpperCase()) >= 0;
}
