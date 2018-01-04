## Really Simple Call Center

This demonstrates a simple but scalable and easily-extensible call center app using:

 [Plivo](https://www.plivo.com/) ![Plivo](https://www.plivo.com/assets/dist/img/logo.png)

 and

 [RSMQ](https://github.com/smrchy/rsmq) <img src="https://img.webmart.de/rsmq_wide.png" width=150>

### How it Works
This application consists of two services, a Plivo application endpoint and an RSMQ queue worker. When a caller dials in, Plivo directs the call to the application, which places the caller in a conference, then enqueues the call. The queue worker then dials an agent, specifying an application callback to add the agent to the conference.

![Diagram](https://callcenter.joeleaver.com/static/diagram.png)

### Scaling the Application
The application is easily scaled by increasing the number of application endpoint services and/or by increasing the number of queue workers. RSMQ is backed by a redis datastore, which is natively performant, but can be scaled via clustering. Though not tested, even with a single VM running a single application endpoint server and a single queue worker, Really Simple Call Center should handle hundreds or even thousands of calls per minute.

### Getting Started
* Make sure you have a working Redis server
* Download the repository, and init the two node applications
* Set values in `config/config.json`
* Start the worker
* Start the application server
* &#128077;
