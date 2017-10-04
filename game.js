console.log('Initializing...')

var canvas = document.getElementById('canvas')
  , ctx = canvas.getContext('2d')
  , height = canvas.height = window.innerHeight
  , width = canvas.width = window.innerWidth
  , bgColor = 'black'
  , mapScale = 5
  , cellSize = 4
  , cellNumber = 20000
  , keysDown = {}
  , keyMap = {
      '87': 0,
      '38': 0,
      '68': 1,
      '39': 1,
      '83': 2,
      '40': 2,
      '65': 3,
      '37': 3
    }
  , xMove
  , yMove

var Cell = function(x, y, entrance) {
  this.x = parseInt(x)
  this.y = parseInt(y)
  this.size = cellSize
  this.color = 'black'
  this.entrance = entrance ? true : false
  this.exit = false
}

Cell.prototype.draw = function(xOff, yOff) {
  ctx.fillStyle = this.color
  ctx.fillRect(this.x - parseInt(this.size/2),
               this.y - parseInt(this.size/2),
               this.size, this.size)

  if(this.entrance) {
    ctx.fillStyle = 'yellow'
    ctx.fillRect(this.x - parseInt(this.size/3),
                 this.y - parseInt(this.size/3),
                 parseInt(this.size/2),
                 parseInt(this.size/2))
    ctx.fillStyle = this.color
  } else if(this.exit) {
    ctx.fillStyle = 'cyan'
    ctx.fillRect(this.x - parseInt(this.size/3),
                 this.y - parseInt(this.size/3),
                 parseInt(this.size/2),
                 parseInt(this.size/2))
    ctx.fillStyle = this.color
  }
}

Cell.prototype.makeExit = function() {
  this.exit = true
}

function makeNewCell(prevCell, dir) {
  return dir === 0 ?
    prevCell.y - cellSize >= -mapScale*height ?
      new Cell(prevCell.x, prevCell.y - cellSize) :
      new Cell(prevCell.x, prevCell.y + cellSize) :
    dir === 1 ?
    prevCell.x + cellSize >= mapScale*width ?
      new Cell(prevCell.x - cellSize, prevCell.y) :
      new Cell(prevCell.x + cellSize, prevCell.y):
    dir === 2 ?
    prevCell.y + cellSize >= mapScale*height ?
      new Cell(prevCell.x, prevCell.y - cellSize) :
      new Cell(prevCell.x, prevCell.y + cellSize) :
    prevCell.x - cellSize <= -mapScale*width ?
      new Cell(prevCell.x + cellSize, prevCell.y) :
      new Cell(prevCell.x - cellSize, prevCell.y)
}

var Map = function(width, height) {
  this.height = height
  this.width = width
  this.offsetX = 0
  this.offsetY = 0
  this.cells = []
  this.maxX = 0
  this.minX = width
  this.maxY = 0
  this.minY = height

  this.generate = function() {
    var initCell = new Cell(width/2, height/2, true)
      , chunkSize = 3000
      , chunks = parseInt(cellNumber / chunkSize)+1

    this.cells.push(initCell)

    for(var i = 0; i < chunks; i++) {
      if(i == chunks - 1 && i != 0) {
        this.generateAdjacentCells(this.cells[this.cells.length-1], cellNumber % chunkSize)
      } else [
        this.generateAdjacentCells(this.cells[this.cells.length-1], chunkSize)
      ]
    }
    console.log('Sorting cells...')
    this.cells = _.orderBy(this.cells,
                           ['x', 'y'], ['y', 'asc'])
    console.log(this.cells.length + ' cells sorted. Culling the herd...')
    this.cells = _.sortedUniqBy(this.cells, function(i) {
      return i.x.toString()+','+i.y.toString()
    })
    console.log('Killed ' + (cellNumber - this.cells.length) + ' cells.')
    this.cells.push(this.cells.shift())

  }

  this.generateAdjacentCells = function(prevCell, n, i) {
    i = i === undefined ? 0 : i

    var newCell = makeNewCell(prevCell, randInt(4))
    if(n == i) newCell.makeExit()

    this.cells.push(newCell)

    return i < n ?
      this.generateAdjacentCells(newCell, n, ++i) : newCell
  }

  this.refresh = function() {
    ctx.fillStyle = 'green'
    ctx.fillRect(cellSize-2, cellSize-2,
                 (width-2*cellSize)+4,
                 (height-2*cellSize)+4)
  }

  this.center = function() {

    this.cells.forEach(function(curr, i, arr) {
      this.maxX = curr.x >= this.maxX ? curr.x : this.maxX
      this.minX = curr.x <= this.minX ? curr.x : this.minX
      this.maxY = curr.y >= this.maxY ? curr.y : this.maxY
      this.minY = curr.y <= this.minY ? curr.y : this.minY

      if(i == arr.length - 1) {
        var xRatio = ((1 - (this.maxX / width)) - (this.minX / width))/2
          , yRatio = -((1 - (this.maxY / height)) - (this.minY / height))/2

        xMove = parseInt(width * xRatio)
        yMove = parseInt(-height * yRatio)

        this.cells.forEach(function(curr, i, arr) {
          curr.x += xMove
          curr.y += yMove
        })
      }
    }.bind(this))
  }

  this.draw = function() {
    this.cells.forEach(function(curr, i, arr) {
      curr.draw()
    })
  }

  // takes direction object d with properties x and y
  this.pan = function(d) {
    this.cells.forEach(function(curr, i, arr) {
      curr.x += d.x
      curr.y += d.y
    })
  }
}

var Player = function(map) {
  this.x = parseInt(width/2)
  this.y = parseInt(height/2)
  this.map = map

  this.move = function() {
    _.forIn(keysDown, function(val, key, obj) {
      d = val ? keyMap[key] : null

      d === 0 ?
        // Is there a wall?
        _.find(this.map.cells, function(i) {
          return Math.abs(i.x - this.x) <= 1 &&
            Math.abs(i.y - (this.y - cellSize)) <= 1
        }.bind(this)) !== undefined ?
          this.y -= cellSize :
        null :
      d == 1 ?
        _.find(this.map.cells, function(i) {
          return Math.abs(i.x - (this.x + cellSize)) <= 1 &&
            Math.abs(i.y - this.y) <= 1
        }.bind(this)) !== undefined ?
          this.x += cellSize :
        null :
      d == 2 ?
        _.find(this.map.cells, function(i) {
          return Math.abs(i.x - this.x) <= 1 &&
            Math.abs(i.y - (this.y + cellSize)) <= 1
        }.bind(this)) !== undefined ?
          this.y += cellSize :
        null :
      d == 3 ?
        _.find(this.map.cells, function(i) {
          return Math.abs(i.x - (this.x - cellSize)) <= 1 &&
            Math.abs(i.y - this.y) <= 1
        }.bind(this)) !== undefined ?
          this.x -= cellSize :
        null :
      null
    }.bind(this))

    if(this.x < 0) {
      this.map.pan({x: width, y: 0})
      this.x += width
    } else if(this.x >= width) {
      this.map.pan({x: -width, y: 0})
      this.x -= width
    } else if(this.y < 0) {
      this.map.pan({x: 0, y: height})
      this.y += height
    } else if(this.y >= height) {
      this.map.pan({x: 0, y: -height})
      this.y -= height
    }
  }.bind(this)

  this.center = function() {
    this.x += xMove
    this.y += yMove
  }

  this.draw = function() {
    ctx.fillStyle = 'pink'
    ctx.fillRect(this.x - parseInt(cellSize/2),
                 this.y - parseInt(cellSize/2),
                 cellSize, cellSize)
  }
}


function randInt(n) {
  return Math.floor(Math.random() * n)
}

function randFloat(n) {
  return Math.random() * n
}


var startTime = Date.now()
var map = new Map(width, height)
    map.refresh()
console.log('Generating Cells...')
    map.generate()
console.log('Map generated. Centering...')
    map.center()
var player = new Player(map)
  , movePlayer = _.throttle(player.move, 40)
    player.center()

console.log('Map generation took ' +
            (Date.now() - startTime)/1000 + ' seonds')

function refresh() {
  ctx.fillStyle = bgColor
  ctx.fillRect(0,0, width, height)
}

function draw() {
  refresh()
  map.refresh()
  map.draw()
  movePlayer()
  player.draw()
  requestAnimationFrame(draw)
}

window.addEventListener('keydown', function(e) {
  e.preventDefault()
  keysDown[e.keyCode] = true
})
window.addEventListener('keyup', function(e) {
  keysDown[e.keyCode] = false
})

requestAnimationFrame(draw)

