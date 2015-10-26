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
                {name: 'userStoryName', type: 'string'},
                {name: 'numberOfTestsPlanned', type: 'int'},
                {name: 'numberOfTestsRan', type: 'int'},
                {name: 'percentComplete', type: 'string'},
                {name: 'testExecutionStatus', type: 'string'}
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
                { text: 'Functional Area',  dataIndex: 'userStoryName' },
                { text: 'Planned', dataIndex: 'numberOfTestsPlanned'},
                { text: 'Actual', dataIndex: 'numberOfTestsRan' },
                { text: '% Complete', dataIndex: 'percentComplete' },
                { text: 'Status', dataIndex: 'testExecutionStatus', tdCls: 'testStatus', flex: 1 }
            ],
            viewConfig: {
                getRowClass: function(record, index, rowParams, store) {
                    status = record.get('testExecutionStatus');
                    switch(status) {
                        case 'In Progress': return 'in_progress';
                        case 'Not Started': return 'not_started';
                        case 'Complete': return 'complete';
                        default: return '';
                    }
                }
            }
        }));
    },

    _onIterationComboboxLoad : function() {
        this._loadTableData([this.iterationCombobox.getQueryFromSelected()]);
    },

    _loadTableData : function(filters) {

        // Reset the table data stores
        this._statusDataStore.removeAll();

        var that = this;
        Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            fetch: ['Name', 'TestCaseCount', 'TestCases'],
            autoLoad: true,
            filters: filters,
            listeners: {
                load: function(store, userStories) {
                    for(var x in userStories) {
                        var userStory = userStories[x];
                        that._loadTestCases(userStory);
                    }
                }
            }
        });
    },

    _refreshStatusTotalsTable : function() {
        this._statusTotalsDataStore.removeAll();

        var totalNumberOfTestsPlanned = 0;
        var totalNumberOfTestsRan = 0;

        for(var x in this._statusDataStore.data.items) {
            var row = this._statusDataStore.data.items[x].data;
            totalNumberOfTestsPlanned += row.numberOfTestsPlanned;
            totalNumberOfTestsRan += row.numberOfTestsRan;
            }

        this._statusTotalsDataStore.add(Ext.create('TableDataObject', {
            userStoryName : '-',
            numberOfTestsPlanned : totalNumberOfTestsPlanned,
            numberOfTestsRan : totalNumberOfTestsRan,
            percentComplete : this._getPercentComplete(totalNumberOfTestsPlanned, totalNumberOfTestsRan),
            testExecutionStatus : this._getTestExecutionStatus(totalNumberOfTestsPlanned, totalNumberOfTestsRan)
        }));
    },

    _loadTestCases : function(userStory) {
        var that = this;
        userStory.getCollection('TestCases').load({
            fetch: ['LastRun'],
            callback: function(testCases, operation, success) {
                var tableRowItem = that._getTableRowItem(userStory, testCases);
                that._statusDataStore.add(tableRowItem);
                that._refreshStatusTotalsTable();
            }
        });
    },

    _getTableRowItem : function(userStory, testCases) {
        var userStoryName = userStory.get('Name');
        var numberOfTestsPlanned = parseInt(userStory.get('TestCaseCount'), 10);
        var numberOfTestsRan = this._getNumberOfTestsRan(testCases);
        var percentComplete = this._getPercentComplete(numberOfTestsPlanned, numberOfTestsRan);
        var testExecutionStatus = this._getTestExecutionStatus(numberOfTestsPlanned, numberOfTestsRan);

        return Ext.create('TableDataObject', {
            userStoryName : userStoryName,
            numberOfTestsPlanned : numberOfTestsPlanned,
            numberOfTestsRan : numberOfTestsRan,
            percentComplete : percentComplete,
            testExecutionStatus : testExecutionStatus
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
