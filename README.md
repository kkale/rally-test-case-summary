rally-test-case-summary
=========================

## Overview
A Rally app designed to report information regarding the status of test cases of an iteration.

The application works by performing the following steps:

1. Inspects ALL **User Stories** (or **Functional Areas**) for the current **Project** and **Iteration**.
2. Inspects ALL **Test Cases** assigned under each of the **User Stories** from step #1.
3. Sets column **Planned** as number of **Test Cases** found under each **User Story**.
4. Sets column **Actual** as the number of **Test Cases** found under each **User Story** that has been **executed** at least once. (Does not inspect pass or fail status).
5. Performs calculations for **Percentage Complete**.
6. Sets a text **Status** based on **Percentage Complete**.
<= 0% - Not Started
> 0% - In Progress
= 100% - Complete

## License

rally-test-case-status is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

##Documentation for SDK

This application was developed using the [rally-app-builder](https://github.com/RallyApps/rally-app-builder) and [Rally App SDK 2.0](https://help.rallydev.com/apps/2.0/doc/).
