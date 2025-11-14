let mongoose = require("mongoose");

let JobApplicationSchema = new mongoose.Schema(
    {
        company: String,
        position: String,
        dateApplied: Date,
        status: String,
        location: String,
        jobType: String,
        notes: String,
    },
    {
        collection: "ApplicationData",
    }

    );
module.exports = mongoose.model('Application', JobApplicationSchema);