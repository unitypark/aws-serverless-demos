package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
)

const OS_REDDIT_INDEX string = "reddit_1"
const DATASET_FILE_NAME string = "reddit_dataset.json"
const CONVERTED_DATASET_FILE_NAME string = "bulk.json"

type OpenSearchBulkHeader struct {
	Metadata OpenSearchBulkMetadata `json:"index"`
}

type OpenSearchBulkMetadata struct {
	Index string `json:"_index"`
	Id    string `json:"_id,omitempty"`
}

type RedditPost struct {
	Documents []Document `json:"posts"`
}

type Document struct {
	Title   string `json:"title"`
	Body    string `json:"body"`
	Url     string `json:"url"`
	Comment string `json:"comment"`
}

func main() {
	// Open the JSON file
	file, err := os.Open(DATASET_FILE_NAME)
	if err != nil {
		log.Fatalf("Error opening file: %v", err)
	}
	defer file.Close()

	// Read the file content
	content, err := ioutil.ReadAll(file)
	if err != nil {
		log.Fatalf("Error reading file: %v", err)
	}

	// Parse the JSON content
	var redditPosts RedditPost
	err = json.Unmarshal(content, &redditPosts)
	if err != nil {
		log.Fatalf("Error unmarshalling JSON: %v", err)
	}

	opensearchBulkHeader := OpenSearchBulkHeader{
		Metadata: OpenSearchBulkMetadata{
			Index: OS_REDDIT_INDEX,
		},
	}
	opensearchBulkHeaderBytes, _ := json.Marshal(opensearchBulkHeader)

	convertedFile, err := os.OpenFile(CONVERTED_DATASET_FILE_NAME, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0666)
	if err != nil {
		fmt.Println(err)
		return
	}
	defer convertedFile.Close()

	// total 6187 posts
	log.Println("documents amount: ", len(redditPosts.Documents))

	for i, document := range redditPosts.Documents {
		// {"Message":"Request size exceeded 10485760 bytes"}, if I try to bulk upload whole json dataset
		// part 1
		if i == 3000 {
			break
		}
		// part 2
		/* if i < 3000 {
			continue
		} */
		documentBytes, _ := json.Marshal(document)
		// write bulk header metadata
		convertedFile.Write(opensearchBulkHeaderBytes)
		// write empty line
		convertedFile.WriteString("\n")
		// write document
		convertedFile.Write(documentBytes)
		// write empty line
		convertedFile.WriteString("\n")
	}
}
