const argv = require('minimist')(process.argv.slice(2));
const webtask = require('./webtask');

const {
	o,
	r,
	d,
	w,
	g: github_token
} = argv;
const context = {
	data: {
		o,
		r,
		d,
		w,
	},
	secrets: {
		github_token,
	}
};
webtask(context, (err, msg) => {
	if (err) {
		return console.error(err);
	}

	console.log(msg);
})
