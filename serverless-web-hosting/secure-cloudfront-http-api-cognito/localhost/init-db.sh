#!/bin/bash

aws dynamodb create-table --cli-input-json file://db/NetworkStationTable.json --endpoint-url http://localhost:8000
echo "NetworkStation table is created into local DyanmoDb"

aws dynamodb batch-write-item  --request-items file://db/NetworkStationData.json --endpoint-url http://localhost:8000
echo "NetworkStation items are inserted into local DyanmoDb"
