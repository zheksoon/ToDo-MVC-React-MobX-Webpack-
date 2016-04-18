import React from 'react';
import ReactDOM from 'react-dom';
import {observable, extendObservable, computed, transaction, autorun} from 'mobx';
import {observer} from 'mobx-react';

import DevTools from 'mobx-react-devtools';


var index = 0;

class TodoItem {
    constructor(label, isDone = false) {
        this.id = ++index;

        extendObservable(this, {
            label: label,
            isDone: isDone,
        })
    }

    switchDone() {
        this.isDone = !this.isDone;
    }
}

class TodoList {
    constructor() {
        this.id = ++index;

        extendObservable(this, {
            todoItems: [],

            leftCount: function() {
                return this.todoItems.reduce((count, item) => count += item.isDone ? 0 : 1, 0)
            }
        })
    }

    clearDone() {
        this.todoItems.replace(this.todoItems.filter(item => !item.isDone))
    }

    addItem(item) {
        this.todoItems.push(item)
    }
}


class Paginator {
    constructor(items, itemsPerPage = 20) {
        this.itemsPerPage = itemsPerPage;
        this.items = items;

        extendObservable(this, {
            pageNumber: 0,

            itemsLength: function() {
                return this.items.length
            },
            paginatedItems: function() {
                var pageNumber = this.pageNumber
                return items.slice(pageNumber * this.itemsPerPage, (pageNumber + 1) * this.itemsPerPage)
            },
            prevPagePossible: function() {
                return this.pageNumber > 0;
            },
            nextPagePossible: function() {
                return (this.pageNumber + 1) * this.itemsPerPage < this.itemsLength
            },
            firstDisplayItemNumber: function() {
                if (this.itemsLength > 0) {
                    return this.pageNumber * this.itemsPerPage + 1
                } else {
                    return 0
                }
            },
            lastDisplayItemNumber: function() {
                return this.pageNumber * this.itemsPerPage + this.paginatedItems.length
            },
        })

        this.pageUpdaterCancel = autorun(() => {
            var itemsLength = this.itemsLength;
            var pageNumber = this.pageNumber;
            if (itemsLength <= pageNumber * this.itemsPerPage) {
                this.pageNumber = Math.floor(Math.max(itemsLength - 1, 0) / this.itemsPerPage);
            }
        })
    }

    prevPage() {
        if (this.prevPagePossible) {
            this.pageNumber -= 1
        }
    }

    nextPage() {
        if (this.nextPagePossible) {
            this.pageNumber += 1
        }
    }
}

var TodoItemView = observer(React.createClass({
    getInitialState: function() {
        return {
            isEditMode: false,
            currentText: '',
        }
    },
    componentWillReceiveProps: function() {
        this.exitEditMode()
    },
    render: function() {
        var todoItem = this.props.item

        return <div className="todo-item">
            <input type="checkbox" checked={todoItem.isDone} onChange={this.switchDone}/>
            {
                (this.state.isEditMode) 
                ?
                    <span>
                        <input type="text" autoFocus value={this.state.currentText} onChange={this.onTextChange}/>
                        <input type="button" value="OK" onClick={this.confirmChange} />
                        <input type="button" value="Cancel" onClick={this.exitEditMode} />
                    </span>
                : 
                    <span onDoubleClick={this.enterEditMode}>{todoItem.label}</span>
            }
        </div>
    },
    switchDone: function() {
        this.props.item.switchDone()
    },
    onTextChange: function(e) {
        var text = e.target.value;
        this.setState({ currentText: text })
    },
    confirmChange: function(e) {
        this.props.item.label = this.state.currentText;
        this.exitEditMode(e)
    },
    enterEditMode: function() {
        this.setState({
            isEditMode: true,
            currentText: this.props.item.label,
        });
    },
    exitEditMode: function(e) {
        this.setState({ isEditMode: false });
    },
}))

var TasksLeftView = observer((props) => {
    return <p>Tasks left: {props.todoList.leftCount}</p>
})

var PaginatorView = observer(React.createClass({

    render: function() {
        var paginator = this.props.paginator;
        var renderFunction = this.props.render;

        var paginatedItems = paginator.paginatedItems
        var paginatedItemsView = paginatedItems.map(item => React.createElement(renderFunction, {item: item, key: item.id}));

        return <div>
            <div>
                {paginatedItemsView}
            </div>
            <div>
                <input type="button" disabled={!paginator.prevPagePossible} onClick={this.prevPage} value="Prev" />
                <span>{`${paginator.firstDisplayItemNumber} - ${paginator.lastDisplayItemNumber} from ${paginator.itemsLength}`}</span>
                <input type="button" disabled={!paginator.nextPagePossible} onClick={this.nextPage} value="Next" />
            </div>
        </div>
    },
    prevPage: function() {
        this.props.paginator.prevPage()
    },
    nextPage: function() {
        this.props.paginator.nextPage()
    }
}))

var TodoListView = observer(React.createClass({
    getInitialState: function() {
        return {
            todoLabelText: '',
            paginator: new Paginator(this.props.todoList.todoItems, 5),
        }
    },
    render: function() {
        var todoList = this.props.todoList  
        return <div className="todo-list">
            <h1>ToDo list</h1>
            <PaginatorView paginator={this.state.paginator} render={TodoItemView} />
            <TasksLeftView todoList={todoList} />

            <div>
                <input type="text" value={this.state.todoLabelText} onChange={this.onTodoLabelChange} />
                <input type="button" onClick={this.addTodo} value="Add ToDo" />
                <input type="button" onClick={this.clearDone} value="Clear done!" />
            </div>
            <DevTools />
        </div>
    },
    onTodoLabelChange: function(e) {
        this.setState({ todoLabelText: e.target.value })
    },
    addTodo: function() {
        var label = this.state.todoLabelText
        if (label) {
            this.props.todoList.addItem(new TodoItem(label))
            this.setState({ todoLabelText: '' })
        }
    },
    clearDone: function() {
        this.props.todoList.clearDone()
    }
}))

var todoList = new TodoList()
var todo1 = new TodoItem("Hello", false)
var todo2 = new TodoItem("World!", true)

todoList.addItem(todo1)
todoList.addItem(todo2)

for (var i = 0; i < 50; i++)
    todoList.addItem(new TodoItem(Math.random(), Math.random() > 0.5))

// todoList.clearDone()


ReactDOM.render(<TodoListView todoList={todoList} />, document.getElementById('app'))


