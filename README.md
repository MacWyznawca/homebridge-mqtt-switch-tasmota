# homebridge-mqtt-switch-tasmota
Plugin to HomeBridge optimized for work with Itead Sonoff hardware and firmware [Sonoff-Tasmota](https://github.com/arendst/Sonoff-Tasmota) via MQTT.

[MacWyznawca.pl](http://macwyznawca.pl)

Installation
--------------------
    sudo npm install -g homebridge-mqtt-switch-tasmota

Sample HomeBridge Configuration (complete)
--------------------
 {

    "bridge": {
        "name": "Homebridge",
        "username": "CC:22:3D:E3:CE:30",
        "port": 51826,
        "pin": "031-45-154"
    },
    
    "description": "This is an example configuration file. You can use this as a template for creating your own configuration file.",

    "platforms": [],
	  "accessories": [
	    {
			"accessory": "mqtt-switch-tasmota",
			"switchType": "outlet",
		
			"name": "NAME OF THIS ACCESSORY",
		
			"url": "mqtt://MQTT–BROKER-ADDRESS",
			"username": "MQTT USER NAME",
			"password": "MQTT PASSWORD",
		
			"topics": {
				"statusGet": "stat/sonoff/POWER",
				"statusSet": "cmnd/sonoff/power",
				"stateGet": "tele/sonoff/STATE"
			},
			"onValue": "ON",
			"offValue": "OFF",
		
			"activityTopic": "tele/sonoff/LWT",
	        "activityParameter": "Online",
        
			"startCmd": "cmnd/sonoff/TelePeriod",
			"startParameter": "60",

			"manufacturer": "ITEAD",
			"model": "Sonoff",
			"serialNumberMAC": "MAC OR SERIAL NUMBER OR EMPTY"
		}
	]
}

Sample HomeBridge Configuration (minimal)
--------------------
{

    "bridge": {
        "name": "Homebridge",
        "username": "CC:22:3D:E3:CE:30",
        "port": 51826,
        "pin": "031-45-154"
    },
    
    "description": "This is an example MINIMAL configuration file.",

    "platforms": [],
	  "accessories": [
	  {
		"accessory": "mqtt-switch-tasmota",
		
		"name": "NAME OF THIS ACCESSORY",
		
		"url": "mqtt://MQTT–BROKER-ADDRESS",
		"username": "MQTT USER NAME",
		"password": "MQTT PASSWORD",
		
		"topics": {
			"statusGet": "stat/sonoff/POWER",
			"statusSet": "cmnd/sonoff/power"
    }
	]
}

# Description of the configuration file.

**"switchType": "outlet"** - outet for outlet emulation, other or empty for switch.

**sonoff** in topics - topics name of Your Sonoff switch.

**"stateGet": "tele/sonoff/STATE"** - topic for cyclic telemetry information.

**"activityTopic": "tele/sonoff/LWT"** - last will topic for check online state.

**"activityParameter": "Online"** - last will payload for online state.

**"startCmd": "cmnd/sonoff/TelePeriod"** -  command sent after the connection.

**"startParameter": "60"** - payload for **startCmd**.

