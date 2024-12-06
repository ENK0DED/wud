# Trigger API
This API allows to query the state of the triggers.

?> Need to add a new Trigger?  
[Take a look at the documentation.](/triggers/)

## Get all Triggers
This operation lets you get all the configured triggers.

```bash
curl http://wud:3000/api/triggers

[
   {
      "id":"smtp.gmail",
      "type":"smtp",
      "name":"gmail",
      "configuration":{
         "host":"smtp.gmail.com",
         "port":465,
         "user":"xxx@gmail.com",
         "pass":"secret",
         "from":"admin@wud.com",
         "to":"xxx@gmail.com"
      }
   }
]
```

## Get a Trigger by id
This operation lets you get a specific Trigger.

```bash
curl http://wud:3000/api/triggers/smtp/gmail

{
  "id":"smtp.gmail",
  "type":"smtp",
  "name":"gmail",
  "configuration":{
     "host":"smtp.gmail.com",
     "port":465,
     "user":"xxx@gmail.com",
     "pass":"secret",
     "from":"admin@wud.com",
     "to":"xxx@gmail.com"
  }
}
```

## Running a trigger
This operation lets you run a specific Trigger with simulated data.

```bash
export CONTAINER='{"id":"123456789","name":"container_test","watcher":"watcher_test","updateKind":{"kind":"tag","semverDiff":"patch","localValue":"1.2.3","remoteValue":"1.2.4","result":{"link":"https://my-container/release-notes/"}}}'
curl -X POST -H "Content-Type: application/json" -d $CONTAINER http://wud:3000/api/triggers/smtp/gmail
```