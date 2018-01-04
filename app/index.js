var config = require('../config/config.json');
var plivo = require('plivo');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var RedisSMQ = require("rsmq");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

var client = new plivo.Client(config.plivo.auth_id, config.plivo.auth_token);
var queue = new RedisSMQ({
    host: config.queue.redis_host,
    port: config.queue.redis_port,
    ns: config.queue.redis_namespace
});

// Ensure Queue Exists
queue.createQueue({qname: config.queue.name}, function (err, resp) {
		if (resp===1) {
			console.log("Queue Created")
		}else if (err.name == "queueExists") {
      console.log("Queue Exists")
    }else{
      console.log("Could Not Create Queue, Error: " + err);
      process.exit(1);
    }
});

// Start the Server
server.listen(config.app.port);

// Enqueue Incoming Calls
app.all('/app/enqueue', function(request, response) {
  var r = plivo.Response();
  r.addSpeak(config.app.enqueue_spoken_message);
  var params = {
      "callbackUrl": config.base_url + "/conference_callback/",
      "waitSound": config.base_url + "/hold_music/",
      "startConferenceOnEnter" : "false",
      "endConferenceOnExit" : "true"
  };

  var conference_name = request.body.CallUUID; // One unique conference room per caller, identified by the original caller
  r.addConference(conference_name, params);

  response.set({
      "Content-Type": "text/xml"
  });
  response.send(r.toXML());

  console.log("Conference Created for Call " + request.body.CallUUID);
});

// Handle Conference Callback
app.all('/app/conference_callback/', function(request, response) {

    // Enqueue Caller
    if (request.body.CallUUID == request.body.ConferenceName && request.body.ConferenceAction == "enter") { // Only enqueue if it's the first (original) caller entering the conference
      queue.sendMessage({qname: config.queue.name, message: request.body.ConferenceName}, function (err, resp) {
      	if (resp) {
          console.log("\nEnqueued --- ConferenceUUID: " + request.body.ConferenceName + ", Queue ID: " + resp);
      	}else{
          console.log("\nMessage Queuing Failed, Error: " + err)
        }
      });
    }
    console.log ('\nConference Callback --- Action: ' + request.body.ConferenceAction + ' Conference Name: ' + request.body.ConferenceName);
    response.sendStatus(200);
});

// Hold Music
app.all('/app/hold_music/', function(request, response) {

  var r = plivo.Response();
  var play_body = config.app.hold_music_url;
  var play_params = {
    "loop": "0"
  };
  r.addPlay(play_body, play_params);

  response.set({
      "Content-Type": "text/xml"
  });
  response.send(r.toXML());
});

// Attach Agent
app.all('/app/attach_agent/:conf', function(request, response) {
  var r = plivo.Response();
  var params = {
      "startConferenceOnEnter" : "true",
      "endConferenceOnExit" : "true"
  };
  r.addConference(request.params.conf, params);

  response.set({
      "Content-Type": "text/xml"
  });
  response.send(r.toXML());
});

// Hangup
app.all('/app/hangup/', function(request, response) {
  console.log("\nHangup: "+ request.body.CallUUID);
  response.sendStatus(200);
});

// Plivo Fallback
app.all('/app/fallback/', function(request, response) {
  console.log("\nFALLBACK:\n %j", request.body);
  response.sendStatus(200);
});
