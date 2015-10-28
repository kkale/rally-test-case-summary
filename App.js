Ext.define('test-case-status', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {

        this.iterationCombobox = this.add({
            xtype: 'rallyiterationcombobox',
            listeners: {
                ready: this._onIterationComboboxLoad,
                select: this._onIterationComboboxLoad,
                scope: this
            }
        });

        // Defines the model object we will be using for our table data store object.
        Ext.define('TableDataObject', {
            extend: 'Ext.data.Model',
            fields: [
                {name: 'type', type: 'string'},
                {name: 'count', type: 'int'},
                {name: 'percentage', type: 'double'}
            ]
        });

        // Creates the table data store objects. This is used to define the entries within the table displayed
        // on the UI.
        this._statusDataStore = this._createTableStore('testCaseStatusStore');
        this._statusTotalsDataStore = this._createTableStore('testCaseStatusTotalsStore');

        // Uses the data stores to draw the tables on the UI.
        this.statusGridPanel = this._createGridPanel('Test Case Status', this._statusDataStore);
        this.statusTotalsGridPanel = this._createGridPanel('Iteration Totals', this._statusTotalsDataStore);

    },

    _createTableStore : function(storeName) {
    return Ext.create('Ext.data.Store', {
            storeId: storeName,
            model: 'TableDataObject',
            data: {'items' : [] },
            proxy: {
                type: 'memory',
                reader: {
                    type: 'json',
                    root: 'items'
                }
            }
        });
    },

    _createGridPanel : function(title, dataStore) {
    return this.add(Ext.create('Ext.grid.Panel', {
            title: title,
            store: dataStore,
            columns: [
                { text: 'Last Verdict',  dataIndex: 'type' },
                { text: 'Count', dataIndex: 'count' },
                { text: 'Percentage', dataIndex : 'percentage' }
            ]
            }));
    },

    _onIterationComboboxLoad : function() {
        this._loadTableData([this.iterationCombobox.getQueryFromSelected()]);
    },

    _loadTableData : function(filters) {

        // Reset the table data stores
        this._statusDataStore.removeAll();

        var that = this;
        that.all_tests = [];
        Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            fetch: ['Name', 'TestCaseCount', 'TestCases'],
            autoLoad: true,
            filters: filters,
            listeners: {
                load: function(store, userStories) {
                    for(var x in userStories) {
                        var userStory = userStories[x];
                        that._loadTestCases(userStory, that);
                    }
                }
            }
        });
    },

    _calcTestStats : function(tests) {
        if (this.all_tests === undefined) {
            this.all_tests = tests;
        } else {
            this.all_tests = this.all_tests.concat(tests);
        }

        if (this.all_tests === undefined) {
            console.log("Error no tests found.");
            return;
        }
        test_count = this.all_tests.length;

        // Type, Count, Percent.
        stats = [["Blocked", 0, 0.0],
                 ["Error", 0, 0.0],
                 ["Fail", 0, 0.0],
                 ["Inconclusive", 0, 0.0],
                 ["", 0, 0.0],
                 ["Pass", 0, 0.0]];

        // Loop through all the tests and update counts
        for (var i = 0;i < test_count; i++) {
            for(var j = 0; j < stats.length; j++) {
                if (this.all_tests[i].get("LastVerdict") === stats[j][0]) {
                    stats[j][1]++;
                }
            }
        }

        // Percent
        if (test_count !== 0) {
            for(i = 0; i < stats.length; i++) {
                percent = stats[i][1] / test_count;
                stats[i][2] = Math.floor(percent * 10000) / 100;
            }
        }

        // Add current status to table
        this._statusDataStore.removeAll();
        for(i = 0; i < stats.length; i++) {
            if (stats[i][0] === "") {
                stats[i][0] = "None Found";
            }
            tableRowItem = this._getTableRowItem(stats[i][0], stats[i][1], stats[i][2]);
            this._statusDataStore.add(tableRowItem);
            this._refreshStatusTotalsTable();
        }
    },

    _refreshStatusTotalsTable : function() {
        this._statusTotalsDataStore.removeAll();

        this._statusTotalsDataStore.add(Ext.create('TableDataObject', {
            type : '-',
            count : test_count,
            percentage : 100.00
        }));
    },

    _loadTestCases : function(userStory, that) {
        userStory.getCollection('TestCases').load({
            // don't forget to trim this fetch:
            fetch: ['LastVerdict'],
            callback: function(testCases, operation, success) {
                that._calcTestStats(testCases);
            }
        });
        return;
    },

    _getTableRowItem : function(type, count, percent) {
        return Ext.create('TableDataObject', {
            type : type,
            count: count,
            percentage : percent
        });
    },

    _getNumberOfTestsRan : function(testCases) {
        var testsRan = 0;
        Ext.Array.each(testCases, function(testCase) {
            if (testCase.get('LastRun')) {
                testsRan++;
            }
        });
        return testsRan;
    },

    _getTestExecutionStatus : function(numberOfTestsPlanned, numberOfTestsRan) {
        var status = 'Not Started';
        if (numberOfTestsPlanned === numberOfTestsRan && numberOfTestsPlanned !== 0) {
            status = 'Complete';
        } else if (numberOfTestsRan > 0) {
            status = 'In Progress';
        }
        return status;
    },

    _getPercentComplete : function(numberOfTestsPlanned, numberOfTestsRan) {
        var percentComplete = 0;
        if (numberOfTestsRan !== 0) {
            percentComplete = parseInt((numberOfTestsRan / numberOfTestsPlanned) * 100, 10);
        }
        return percentComplete + '%';
    }

});
