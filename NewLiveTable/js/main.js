'use strict';

var emitter = exports.emitter;
var table = document.getElementById('table');
var cells = new Map();
var letters = ['A', 'B', 'C', 'D', 'E', 'F'];

var tr;
tr = document.createElement('tr');
tr.innerHTML = '<td></td>' + letters.map(function(col) {
    return '<td>' + col + '</td>';
  }).join('');
table.appendChild(tr);

for (var i = 1; i <= 5; i++) {
  tr = document.createElement('tr');
  tr.innerHTML = '<td>' + i + '</td>' + letters.map(function(col) {
      return '<td><input id="' + col + i + '" type="text"></td>';
    }).join('');
  table.appendChild(tr);
  letters.forEach(function(col) {
    var cell = col + i;
    var input = document.getElementById(cell);
    input.addEventListener('focus', focus);
    input.addEventListener('blur', blur);
    input.addEventListener('keyup', keyup);
    cells.set(cell, input);
  });
}

function focus(event) {
  let cell = event.target;
  let formula = cell.dataset.formula;
  if (formula) cell.value = formula;
}

function blur(event) {
  let cell = event.target;
  if (isFormulaInput(cell)) {
    let formula = cell.value.substring(1);
    setFormula(cell, formula);
    socket.send(JSON.stringify({
      cell: cell.id,
      formula: formula
    }));
  } else {
    delete cell.dataset.formula;
  }
}

function keyup(event) {
  let cell = event.target;
  if (notFormulaInput(cell)) emitter.emit(cell.id);
  socket.send(JSON.stringify({
    cell: cell.id,
    value: cell.value
  }));
}

var isFormulaInput = cell => cell.value.startsWith('=');
var notFormulaInput = cell => !isFormulaInput(cell);

function setFormula(cell, formula) {
  let parsedFormula = acorn.parse(formula).body;
  // currently only 1-line expressions are supported
  if (parsedFormula.length != 1) {
    cell.value = '';
    delete cell.dataset.formula;
    emitter.emit(cell.id);
  } else {
    cell.dataset.formula = cell.value; // saving formula
    let calculateCellValue = () => {
      let interpreter = new Interpreter(formula, initFormulaInterpreter);
      interpreter.run();
      cell.value = interpreter.value;
      emitter.emit(cell.id);
    };
    subscribeToIdentifiersIn(parsedFormula[0].expression, calculateCellValue);
    calculateCellValue();
  }
}

function parseInterpretedCellValue(val) {
  let num = +val;
  return (isNaN(num) || isNaN(parseFloat(val)))? val : num;
}

function initFormulaInterpreter(interpreter, scope) {
  interpreter.setProperty(scope, 'Math', interpreter.createObject(Math));
  for (let [id, input] of cells.entries()) {
    interpreter.setProperty(scope, id, interpreter.createPrimitive(parseInterpretedCellValue(input.value)));
  }
}

function subscribeToIdentifiersIn(expression, onEvent) {
  if (expression.left) subscribeToIdentifiersIn(expression.left, onEvent);
  if (expression.right) subscribeToIdentifiersIn(expression.right, onEvent);
  if (expression.type === 'Identifier') emitter.on(expression.name, onEvent);
}

var socket = new WebSocket('ws://[::1]/');

socket.onmessage = function(event) {
  let change = JSON.parse(event.data);
  let cell = cells.get(change.cell);
  if (change.hasOwnProperty('formula')) setFormula(cell, change.formula);
  else if (change.hasOwnProperty('value')) {
    cell.value = change.value;
    delete cell.dataset.formula;
  }
  if (notFormulaInput(cell)) emitter.emit(cell.id);
};
