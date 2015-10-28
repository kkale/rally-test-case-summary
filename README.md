rally-test-case-summary
=========================

## Overview
A Rally app designed to report information regarding the status of test cases of an iteration.

![Sample App Image](https://raw.githubusercontent.com/xpanxion/rally-test-case-summary/master/img/sample_img.png)

The application works by performing the following steps:

1. Inspects ALL **User Stories** (or **Functional Areas**) for the current **Project** and **Iteration**.
2. Inspects ALL **Test Cases** assigned under each of the **User Stories** from step #1.
3. Uses all test cases in step #2 to generate values for columns **Last Verdict**, **Coun**, and **Percentage**.

## License

rally-test-case-summary is released under the MIT license.  See the file [LICENSE](./LICENSE) for the full text.

## Documentation for SDK

This application was developed using the [rally-app-builder](https://github.com/RallyApps/rally-app-builder) and [Rally App SDK 2.0](https://help.rallydev.com/apps/2.0/doc/).

## Misc

This code is mostly shamelessley taken from the [rally-test-case-status](https://github.com/xpanxion/rally-test-case-status) by @lopezton.
