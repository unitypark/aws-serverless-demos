# QSK Authentication Gateway

- [Introduction](#introduction)
- [Folder Structure](#folder)
- [Known Issues](#issues)

# <a name="introduction"></a> Introduction

# <a name="folder"></a> Folder Structure

- src: contains source code
- src/auth: contains authenticator class
- src/helpers: contains lambda handler helper functions
- src/lambdas: contains lambda handlers
- src/typings: contains type definitions
- src/util: contains cookies and csrf token generator

# <a name="issues"></a> Known Issues

Cross Region parameter exports are not working automatically, which means, if this stack cannot be automatically updated. If there's update necessary about authentication lambda function, user should manually delete authentication-gateway stack in us-east-1 region and redeploy.
