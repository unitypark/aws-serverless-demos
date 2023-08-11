#!/bin/bash

echo "Domain Name: $1"

echo "
██████╗ ██╗   ██╗██╗██╗     ██████╗ 
██╔══██╗██║   ██║██║██║     ██╔══██╗
██████╔╝██║   ██║██║██║     ██║  ██║
██╔══██╗██║   ██║██║██║     ██║  ██║
██████╔╝╚██████╔╝██║███████╗██████╔╝
╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ 
                                    
"

echo "✅ Build landing zone application..."
cd ../website/landingzone && npm ci && npm run build

echo "✅ Build fileshare service application..."
cd ../fileshare && npm ci && npm run build

echo "✅ Build CDK application..."
cd ../../cdk && npm ci && npm run build


echo "
██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗
██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ 
██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  
██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   
╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   
                                                  
"
if [ -z "$1" ]; then
    echo "✅ Deploy CDK application without domain"
    npx aws-cdk deploy --all --require-approval never
else    
    echo "✅ Deploy CDK application with domain $1"
    npx aws-cdk deploy --all --require-approval never --context domainName=$1
fi
