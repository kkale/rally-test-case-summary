Ext.define('test-case-status', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function() {

        this.iterationCombobox = this.add({
            xtype: 'rallyfieldvaluecombobox',
            model: 'testCase',
            field: 'c_WorkdayTestCycle',
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

        this.pie_data = Ext.create('Ext.data.JsonStore', {
            fields: ['name', 'data'],
            data: [{ 'name': 'blank', 'data': 1}]
        });

        this.pie_chart = Ext.create('Ext.chart.Chart', {
            renderTo: Ext.getBody(),
            width: 500,
            height: 350,
            animate: true,
            store: this.pie_data,
            theme: 'Base:gradients',
            series: [{
                type: 'pie',
                angleField: 'data',
                showInLegend: true,
                tips: {
                    trackMouse: true,
                    width: 140,
                    height: 28,
                  renderer: function(storeItem, item) {
                    this.setTitle(storeItem.get('data') + '%');
                  }
                },
                highlight: {
                    segment: {
                        margin: 20
                    }
                },
                label: {
                    field: 'name',
                    display: 'rotate',
                    contrast: true,
                    font: '18px Arial'
                }
            }]
        });

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
        this._loadTableData([this.iterationCombobox.value]);
    },

    _loadTableData : function(filters) {

        // Reset the table data stores
        this._statusDataStore.removeAll();
        this._refreshStatusTotalsTable(0);

        var that = this;
        that.all_tests = [];
        that.pie_data.data = [];
        Ext.create('Rally.data.wsapi.Store', {
            model: 'UserStory',
            fetch: ['Name', 'TestCaseCount', 'TestCases'],
            autoLoad: true,
            listeners: {
                load: function(store, userStories) {
                    for(var x in userStories) {
                        var userStory = userStories[x];
                        that._loadTestCases(userStory, filters, that);
                    }
                }
            }
        });
    },

    _calcTestStats : function(tests, filters) {
        if (this.all_tests === undefined) {
            this.all_tests = tests;
        } else {
            this.all_tests = this.all_tests.concat(tests);
        }

        if (this.all_tests === undefined) {
            console.log("Error no tests found.");
            return;
        }

        var test_count = this.all_tests.length;

        // Loop through all the tests and update counts
        var dict = {};
        var valid_count = 0;
        for (var i = 0;i < test_count; i++) {
            var field = this.all_tests[i].get('c_WorkdayTestCycle');
            if (field === filters.toString()) {
                valid_count++;
                verdict = this.all_tests[i].get("LastVerdict");
                verdict = (verdict === "" ? "None" : verdict);

                // have we seen it?
                if (!dict.hasOwnProperty(verdict)) {
                    dict[verdict] = [0, 0.0];
                }

                dict[verdict][0]++;
            }
        }

        // Percent
        this._statusDataStore.removeAll();
        this.pie_data.removeAll();
        for (var key in dict) {
            percent = dict[key][0] / valid_count;
            dict[key][1] = Math.floor(percent * 10000) / 100;
            //this.pie_data.add({'name': key, 'data': dict[key][1]});
            tableRowItem = this._getTableRowItem(key, dict[key][0], dict[key][1]);
            this._statusDataStore.add(tableRowItem);
        }
        this._refreshStatusTotalsTable(valid_count);
        test_data = Ext.create('Ext.data.JsonStore', {
            fields: ['name', 'data'],
            data: [{ 'name': 'blank', 'data': 1}]
        });
        this.pie_chart.update(this.pie_data);
    },

    _refreshStatusTotalsTable : function(test_count) {
        this._statusTotalsDataStore.removeAll();

        this._statusTotalsDataStore.add(Ext.create('TableDataObject', {
            type : '-',
            count : test_count,
            percentage : 100.00
        }));
    },

    _loadTestCases : function(userStory, filters, that) {
        userStory.getCollection('TestCases').load({
            fetch: ['c_WorkdayTestCycle', 'LastVerdict'],
            callback: function(testCases, operation, success) {
                that._calcTestStats(testCases, filters);
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
