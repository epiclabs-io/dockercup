var moment = require("moment");
var fs = require("fs");

var log =
	{
		logFile: null,
		logger: function (st) {

			console.log(st);
			if(this.logFile)
                fs.appendFileSync(this.logFile,st + "\n");

		},
		mod: "*",
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