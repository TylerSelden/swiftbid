#!/bin/bash

curl -X POST \
-H "Content-Type: application/json" \
-d '{"name": "test", "expires": 50}' \
localhost:8080/api/post/create_auction
