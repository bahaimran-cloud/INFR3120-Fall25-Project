let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let Application = require('../models/JobApplication');
const JobApplication = require('../models/JobApplication');

router.get('/', (async (req, res, next) => {
    try {
        const applications = await Application.find({});
        console.log(applications);
        res.render('JobApplications/list', {title: 'Job Applications', applications: applications});
    } catch (err) {
        console.error(err);
        res.render('JobApplication/list', {
            error:'Error on server'
        })
    }
}));

router.get('/add',async(req, res, next) => {
    try {
        res.render('JobApplications/add', {title: 'Add Job Application'});
    }
    catch (err) {
        console.error(err);
        res.render('JobApplication/add', {
            error:'Error on server'
        })
    }

})

router.post('/add',async(req, res, next) => {
    try 
    {
        let newApplication = JobApplication({
            "company": req.body.company,
            "position": req.body.position,
            "status": req.body.status,
            "appliedDate": req.body.appliedDate
            // "location": req.body.location
            // notes: req.body.notes
        });
        JobApplication.create(newApplication).then(()=> {
            res.redirect('/applications');
        }) 
    }
    catch (err) {
        console.error(err);
        res.render('JobApplication/add', {
            error:'Error on server'
        })
    }

})

router.get('/edit/:id',async(req, res, next) => {
    try {
        let id = req.params.id;
        const application = await JobApplication.findById(id);
        res.render('JobApplications/edit', {title: 'Edit Job Application', application: application});
    }
    catch (err) {
        console.error(err);
        res.render('JobApplications/edit', {
            error:'Error on server'
        })
    }
})

router.post('/edit/:id',async(req, res, next) => {
    try {
        let id = req.params.id;
        let updateData = {
            company: req.body.company,
            position: req.body.position,
            dateApplied: req.body.dateApplied,
            status: req.body.status,
            location: req.body.location,
            jobType: req.body.jobType,
            notes: req.body.notes
        };
        await JobApplication.findByIdAndUpdate(id, updateData);
        res.redirect('/applications');
    }
    catch (err) {
        console.error(err);
        res.render('JobApplications/edit', {
            error:'Error on server'
        })
    }
})

router.get('/delete/:id',async(req, res, next) => {
    try {
        let id = req.params.id;
        await JobApplication.findByIdAndDelete(id);
        res.redirect('/applications');
    }
    catch (err) {
        console.error(err);
        res.redirect('/applications');
    }
})


module.exports = router;