#!/bin/bash

# Directory containing the files we want to archive
BUILD_DIR="_site"
# Directory where our archive will go
RELEASE_DIR="_release"
# Current Git tag
GIT_TAG=`git describe --abbrev=0 --tags`
# Current Working Directory - name of the directory we are in
CWD=${PWD##*/}
# What the archive should be called
ARCHIVE_FILENAME=$CWD-$GIT_TAG.zip

if [ "$CWD" == "_bin" ]; then
    echo "You must run this command from the base directory of this repository"
    exit 1
fi

# Create the release directory if it doesn't exist already
if [ ! -d $RELEASE_DIR ]; then
    mkdir $RELEASE_DIR;
fi

# Remove the existing build
rm -r _site
# Build a new site
jekyll build
# Change into the build directory so the release is in that directory
cd _site/
# Create a zip file of the site we just created
zip -r ../$RELEASE_DIR/$ARCHIVE_FILENAME .

echo ""
echo "Created archive: $RELEASE_DIR/$ARCHIVE_FILENAME"
