#!/bin/bash

echo "
██████╗ ██╗   ██╗██╗██╗     ██████╗ 
██╔══██╗██║   ██║██║██║     ██╔══██╗
██████╔╝██║   ██║██║██║     ██║  ██║
██╔══██╗██║   ██║██║██║     ██║  ██║
██████╔╝╚██████╔╝██║███████╗██████╔╝
╚═════╝  ╚═════╝ ╚═╝╚══════╝╚═════╝ 
                                    
"

echo "✅ Build fileshare web application..."
cd ../website && npm ci && npm run build

echo "✅ Build edge lambdas..."
cd ../edge && npm ci && npm run build

echo "✅ Build CDK application..."
cd ../cdk && npm ci && npm run build


echo "
██████╗ ███████╗██████╗ ██╗      ██████╗ ██╗   ██╗
██╔══██╗██╔════╝██╔══██╗██║     ██╔═══██╗╚██╗ ██╔╝
██║  ██║█████╗  ██████╔╝██║     ██║   ██║ ╚████╔╝ 
██║  ██║██╔══╝  ██╔═══╝ ██║     ██║   ██║  ╚██╔╝  
██████╔╝███████╗██║     ███████╗╚██████╔╝   ██║   
╚═════╝ ╚══════╝╚═╝     ╚══════╝ ╚═════╝    ╚═╝   
                                                  
"

echo "✅ Deploy CDK application without domain"
npx aws-cdk deploy --all --require-approval never