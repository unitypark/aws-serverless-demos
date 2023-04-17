#!/bin/bash

echo "Build react application"
cd ../web && npm run build

echo "Build edge lambda"
cd ../edge && npm run webpack

echo "Deploy CDK application"
cd ../cdk && npx aws-cdk deploy --all --require-approval never --profile $1
