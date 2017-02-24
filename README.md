# homebridge-mqtt-switch-tasmota
Plugin to HomeBridge optimized for work with Itead Sonoff hardware with firmware Sonoff-Tasmota, MQTT.

HomeBridge config file:

"accessories": [
    {
		"accessory": "mqtt-switch-tasmota",
		"switchType": "outlet",
		
		"name": "NAME OF THIS ACCESSORY",
		
		"url": "mqtt://MQTT-ADDRESS",
		"username": "MQTT USER NAME",
		"password": "MQTT PASSWORD",
		
		"topics": {
			"statusGet": "stat/MQTT/POWER",
			"statusSet": "cmnd/MQTT/power",
			"stateGet": "tele/MQTT/STATE"
		},
		"onValue": "ON",
		"offValue": "OFF",
		
		"activityTopic": "tele/MQTT/LWT",
        "activityParameter": "Online",
        
		"startCmd": "cmnd/MQTT/TelePeriod",
		"startParameter": "60",

		"manufacturer": "ITEAD",
		"model": "Sonoff",
		"serialNumberMAC": "MAC OR SERIAL NUMBER"
	}
	]