# Swiftbid

Swiftbid is a simple, easy-to-use auction website, geared primarially towards fundraisers.

Before use, it's important to add a `config.json` file, with the following structure:

```
{
        "rootpw": "<password>",
        "port": 8080,
        "save": {
                "file": "./save.json",
                "interval": 120000,
                "restore": true,
                "error": "./error.log"
        },
        "admin_can_remove_auction": false
}
```
