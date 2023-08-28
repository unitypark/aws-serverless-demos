#!/bin/bash
export BAT_THEME="ansi"

set -e

WEBSITE_BUCKET_NAME=$1
DISTRIBUTION_ID=$2
API_DOMAIN=$3

# Define hms() function
hms()
{
  # Convert Seconds to Hours, Minutes, Seconds
  # Optional second argument of "long" makes it display
  # the longer format, otherwise short format.
  local SECONDS H M S MM H_TAG M_TAG S_TAG
  SECONDS=${1:-0}
  let S=${SECONDS}%60
  let MM=${SECONDS}/60 # Total number of minutes
  let M=${MM}%60
  let H=${MM}/60
  
  if [ "$2" == "long" ]; then
    # Display "1 hour, 2 minutes and 3 seconds" format
    # Using the x_TAG variables makes this easier to translate; simply appending
    # "s" to the word is not easy to translate into other languages.
    [ "$H" -eq "1" ] && H_TAG="hour" || H_TAG="hours"
    [ "$M" -eq "1" ] && M_TAG="minute" || M_TAG="minutes"
    [ "$S" -eq "1" ] && S_TAG="second" || S_TAG="seconds"
    [ "$H" -gt "0" ] && printf "%d %s " $H "${H_TAG},"
    [ "$SECONDS" -ge "60" ] && printf "%d %s " $M "${M_TAG} and"
    printf "%d %s\n" $S "${S_TAG}"
  else
    # Display "01h02m03s" format
    [ "$H" -gt "0" ] && printf "%02d%s" $H "h"
    [ "$M" -gt "0" ] && printf "%02d%s" $M "m"
    printf "%02d%s\n" $S "s"
  fi
}


echo "
██╗   ██╗██████╗ ██╗      ██████╗  █████╗ ██████╗ 
██║   ██║██╔══██╗██║     ██╔═══██╗██╔══██╗██╔══██╗
██║   ██║██████╔╝██║     ██║   ██║███████║██║  ██║
██║   ██║██╔═══╝ ██║     ██║   ██║██╔══██║██║  ██║
╚██████╔╝██║     ███████╗╚██████╔╝██║  ██║██████╔╝
 ╚═════╝ ╚═╝     ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 
                                                  
"

############################################################
# Main script to upload website asset into s3
############################################################
cd ./website

# Make a note of the start time (in seconds since 1970)
STARTTIME=`date +%s`

echo "✅ Clean up build"
rm -rf build

echo "✅ Clean up node_modules"
rm -rf node_modules

echo "✅ Install packages"
npm i --silent

echo "✅ Build website"
REACT_APP_API_DOMAIN=$3 npm run build

echo "✅ Check current profile"
aws sts get-caller-identity | jq 

echo "✅ Uploading website static files"
aws s3 sync ./build s3://$WEBSITE_BUCKET_NAME --cache-control 'max-age=31536000,public,immutable' --exclude 'index.html' --delete

echo "✅ Uploading website index.html"
aws s3 sync ./build s3://$WEBSITE_BUCKET_NAME --cache-control 'max-age=0,no-cache,no-store,must-revalidate' --exclude '*' --include 'index.html' --delete

echo "✅ Removing DS_Store from s3"
aws s3 rm s3://$WEBSITE_BUCKET_NAME --recursive --exclude "*" --include "*.DS_Store"

echo "✅ Invalidate cloudfront distribution cache"
INVALIDATION_ID=$(aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*" | jq -r '.Invalidation.Id')

echo "✅ Waiting for invalidation: $INVALIDATION_ID"
aws cloudfront wait invalidation-completed --id $INVALIDATION_ID --distribution-id $DISTRIBUTION_ID

ENDTIME=`date +%s`

let DURATION=${ENDTIME}-${STARTTIME}
HOWLONG=`hms $DURATION long`
echo "✅ That took ${HOWLONG} to upload into aws"

echo "🚀 Application is updated in AWS"