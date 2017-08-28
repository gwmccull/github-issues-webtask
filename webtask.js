"use latest";

const rp = require('request-promise-native');
const moment = require('moment');

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
			if (!title) {
				err = 'Unable to generate title based on requested date';
				cb(err);
			}

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
				.catch((error) => {
					err = 'An error occurred while creating the Github issue.';
					return cb(error);
				});
		})
		.catch(function (error) {
			if (error.statusCode === 404) {
				err = 'Unable to find ISSUE_TEMPLATE.md in that repository.';
			} else {
				err = 'Unknown error.';
			}
			return cb(err);
		});
};

function getNextMeeting(dayOfWeek, weekOfMonth) {
	// reminder: moment mutates the original date
	const date = moment();
	const digitOfNextMonth = date.add(1, 'months').month();
	const digitOfMonthAfter = date.add(1, 'months').month();
	const dateOfNextMeeting = date.month(digitOfNextMonth).date(1).hour(0).minute(0).second(0).millisecond(0);
	const indexOfDay = getDayIndex(dayOfWeek);

	// loop through the days until
	// the day of the week and the week of the month match our target
	// or until we get to the end of the month
	let weekIndex = 1;
	while (
		!(dateOfNextMeeting.day() === indexOfDay && weekIndex === weekOfMonth) &&
		dateOfNextMeeting.month() < digitOfMonthAfter
	) {
		if (dateOfNextMeeting.day() === indexOfDay) {
			weekIndex++;
		}
		dateOfNextMeeting.add(1, 'days');
	}

	// if we got to next month, we didn't find the date
	if (dateOfNextMeeting.month() === digitOfMonthAfter) {
		return undefined;
	}

	return dateOfNextMeeting;
}

function generateIssueTitle(dayOfWeek, weekOfMonth) {
	const date = getNextMeeting(dayOfWeek, weekOfMonth);
	return date ? `${(date.format('MMM')).toUpperCase()} ${date.format('Do')} at 6:00pm` : '';
}

function getDayIndex(dayOfWeek = '') {
	return DAYS_OF_WEEK.findIndex((day) => day === dayOfWeek.toUpperCase());
}

function isDayValid(dayOfWeek = '') {
	return getDayIndex(dayOfWeek) >= 0;
}
