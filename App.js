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
                { text: 'Type',  dataIndex: 'type' },
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
                    console.log(that.all_tests);
                    that._calcTestStats();
                }
            }
        });
    },

    _calcTestStats : function() {

        if (this.all_tests === undefined) {
            console.log("Error no tests found.");
            return;
        }

        // Type, Count, Percent.
        stats = [["Blocked", 0, 0.0],
                 ["Error", 0, 0.0],
                 ["Fail", 0, 0.0],
                 ["Inconclusive", 0, 0.0],
                 ["Pass", 0, 0.0]];

        // Loop through all the tests and update counts
        for (var i = 0;i < this.all_tests.length; i++) {
            for(var j = 0; j < stats.length; j++) {
                if (this.all_tests[i].get("LastVerdict") === stats[j][0]) {
                    stats[i][1]++;
                }
            }
        }

        // Percent
        total = this.all_tests.length;
        for(i = 0; i < stats.length; i++) {
                stats[i][2] = stats[i][1] / total;
        }

        // Add these all to the table:
        for(i = 0; i < stats.length; i++) {
            tableRowItem = this._getTableRowItem(stats[i][0], stats[i][1], stats[i][2]);
            this._statusDataStore.add(tableRowItem);
            this._refreshStatusTotalsTable();
        }
    },

    _refreshStatusTotalsTable : function() {
        this._statusTotalsDataStore.removeAll();

        this._statusTotalsDataStore.add(Ext.create('TableDataObject', {
            type : '-',
            count : this.all_tests.length,
            percentage : 0.0
        }));
    },

    _loadTestCases : function(userStory, that) {
        userStory.getCollection('TestCases').load({
            fetch: true,
            callback: function(testCases, operation, success) {
                that.all_tests = that.all_tests.concat(testCases);
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
