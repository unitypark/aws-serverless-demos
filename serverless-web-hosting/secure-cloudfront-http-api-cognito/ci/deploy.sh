#!/bin/bash

if [ -z "$1" ]; then
    echo "aws profile is required"
    echo "e.g. chmod +x deploy.sh && ./deploy.sh <your_current_profile>"
    exit 0
fi

echo "profile to proceed: $1"

echo "Build react application"
cd ../web && npm ci && npm run build

echo "Build edge lambda"
cd ../edge && npm ci && npm run webpack

echo "Deploy CDK application"
cd ../cdk && npm ci && npx aws-cdk deploy --all --require-approval never --profile $1
