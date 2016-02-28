var moment = require("moment");

var log =
	{
		logger: function (st) {

			console.log(st);

		},
		mod: "DOCKERCUP",
		write: function (level, st) {
			this.logger(moment().format("YYYY-MM-DD HH:mm:ss") + " " + level + " " + this.mod + " :" + st);
		},
		info: function (st) {
			this.write("INFO", st);
		},
		debug: function (st) {
			this.write("DEBUG", st);
		},
		warn: function (st) {
			this.write("WARN", st);
		},
		error: function (st) {
			this.write("ERROR", st);
		}
	}
	
module.exports = log;