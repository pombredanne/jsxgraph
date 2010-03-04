/*
    Copyright 2008,2009
        Matthias Ehmann,
        Michael Gerhaeuser,
        Carsten Miller,
        Bianca Valentin,
        Alfred Wassermann,
        Peter Wilfahrt

    This file is part of JSXGraph.

    JSXGraph is free software: you can redistribute it and/or modify
    it under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    JSXGraph is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Lesser General Public License for more details.

    You should have received a copy of the GNU Lesser General Public License
    along with JSXGraph.  If not, see <http://www.gnu.org/licenses/>.

*/
/**
 * Creates a new instance of Sector.
 * @class Sector stores all style and functional properties that are required
 * to draw a sector on a board.
 * @param {JXG.Board} board Reference to the board the sector is drawn on.
 * @param {JXG.Point} p1 Midpoint of the sector.
 * @param {JXG.Point} p2 Point defining the sectors radius
 * @param {JXG.Point} p3 This point defines the angle of the sectors section.
 * @param {Array} ids Unique identifiers for the derived objects (arc, endpoint of the arc, line from p1 to p2, line from p1 to the endpoint of the arc) . 
 * Must be Strings. If null or an empty string is given to any of these, an unique id will be generated.
 * @param {Array} names Names for the derived objects (arc, endpoint of the arc, line from p1 to p2, line from p1 to the endpoint of the arc) . 
 * Must be Strings. If null or an empty string is given to any of these, an unique id will be generated.
 * @param {String} id Unique identifier for this object.  If null or an empty string is given,
 * an unique id will be generated by Board
 * @param {String} name Not necessarily unique name, displayed on the board.  If null or an
 * empty string is given, an unique name will be generated.
 * @see JXG.Board#addSector
 * @constructor
 * @extends JXG.GeometryElement
 */

JXG.createSector = function(board, parents, attributes) {
    var el, defaults, key, options;
        
    // Alles 3 Punkte?
    if ( !(JXG.isPoint(parents[0]) && JXG.isPoint(parents[1]) && JXG.isPoint(parents[2]))) {
        throw new Error("JSXGraph: Can't create Sector with parent types '" + 
                        (typeof parents[0]) + "' and '" + (typeof parents[1]) + "' and '" + 
                        (typeof parents[2]) + "'.");
    }

    // Read the default values from Options and use them in case they are not set by the user
    // in attributes
    defaults = {withLabel:JXG.readOption(board.options,'elements','withLabel'), 
                layer:JXG.readOption(board.options,'layer','sector'),
                useDirection:false}; // useDirection is necessary for circumCircleSectors
    defaults['strokeWidth'] =  board.options.elements['strokeWidth'];
    options = board.options.sector;
    for (key in options) {
        defaults[key] = options[key];
    }
    attributes = JXG.checkAttributes(attributes, defaults);
        
    el = board.create('curve',[[0],[0]],attributes);
    el.type = JXG.OBJECT_TYPE_SECTOR;
    /**
     * Midpoint of the sector.
     * @type JXG.Point
     */
    el.point1 = JXG.getReference(board, parents[0]);
    /**
     * Point defining the arcs circle.
     * @type JXG.Point
     */
    el.point2 = JXG.getReference(board, parents[1]);
    /**
     * The point defining the angle of the arc.
     * @type JXG.Point
     */
    el.point3 = JXG.getReference(board, parents[2]);
    /* Add arc as child to defining points */
    el.point1.addChild(el);
    el.point2.addChild(el);
    el.point3.addChild(el);
    
    el.useDirection = attributes['useDirection'];      // useDirection is necessary for circumCircleSectors

    el.updateDataArray = function() {
        var A = this.point2,
            B = this.point1,
            C = this.point3,
            beta, co, si, matrix,
            phi = this.board.algebra.rad(A,B,C),
            n = 100, i,
            delta = phi/n, //Math.PI/90.0,
            x = B.X(),
            y = B.Y(),
            v, 
            det, p0c, p1c, p2c;

        if (this.useDirection) {  // This is true for circumCircleArcs. In that case there is
                                  // a fourth parent element: [midpoint, point1, point3, point2]
            var det, 
                p0c = parents[1].coords.usrCoords,
                p1c = parents[3].coords.usrCoords,
                p2c = parents[2].coords.usrCoords;
            det = (p0c[1]-p2c[1])*(p0c[2]-p1c[2]) - (p0c[2]-p2c[2])*(p0c[1]-p1c[1]);
            if(det < 0) {
                this.point2 = parents[1];
                this.point3 = parents[2];
            }
            else {
                this.point2 = parents[2];
                this.point3 = parents[1];
            }
        }
        this.dataX = [B.X(),A.X()];
        this.dataY = [B.Y(),A.Y()];
        for (beta=delta,i=1; i<=n; i++, beta+=delta) {
            co = Math.cos(beta); 
            si = Math.sin(beta); 
            matrix = [[1,            0,   0],
                      [x*(1-co)+y*si,co,-si],
                      [y*(1-co)-x*si,si, co]];    
            v = JXG.Math.matVecMult(matrix,A.coords.usrCoords);
            this.dataX.push(v[1]/v[0]);
            this.dataY.push(v[2]/v[0]);
        }
        this.dataX.push(B.X());
        this.dataY.push(B.Y());
    };

    /**
    * Calculates the arcs radius.
    * @type float
    * @return The arcs radius
    */
    el.Radius = function() {
        return this.point2.Dist(this.point1);
    };

    /**
    * @deprecated
    */
    el.getRadius = function() {
        return this.Radius();
    };

    /**
    * Checks whether (x,y) is within the sector defined by the arc.
    * @param {int} x Coordinate in x direction, screen coordinates.
    * @param {int} y Coordinate in y direction, screen coordinates.
    * @return {bool} True if (x,y) is within the sector defined by the arc, False otherwise.
    */
    el.hasPointSector = function (x, y) { 
        var checkPoint = new JXG.Coords(JXG.COORDS_BY_SCREEN, [x,y], this.board),
            r = this.Radius(),
            dist = this.point1.coords.distance(JXG.COORDS_BY_USER,checkPoint),
            has = (dist<r),
            angle;
        
        if(has) {
            angle = this.board.algebra.rad(this.point2,this.point1,checkPoint.usrCoords.slice(1));
            if (angle>this.board.algebra.rad(this.point2,this.point1,this.point3)) { has = false; }
        }
        return has;    
    };

    /**
    * return TextAnchor
    */
    el.getTextAnchor = function() {
        return this.point1.coords;
    };

    /**
    * return LabelAnchor
    */
    el.getLabelAnchor = function() {
        var angle = this.board.algebra.rad(this.point2, this.point1, this.point3),
            dx = 10/(this.board.stretchX),
            dy = 10/(this.board.stretchY),
            p2c = this.point2.coords.usrCoords,
            pmc = this.point1.coords.usrCoords,
            bxminusax = p2c[1] - pmc[1],
            byminusay = p2c[2] - pmc[2],
            coords, vecx, vecy, len;

        if(this.label.content != null) {                          
            this.label.content.relativeCoords = new JXG.Coords(JXG.COORDS_BY_USER, [0/(this.board.stretchX),0/(this.board.stretchY)],this.board);                      
        }  

        coords = new JXG.Coords(JXG.COORDS_BY_USER, 
                        [pmc[1]+ Math.cos(angle*0.5)*bxminusax - Math.sin(angle*0.5)*byminusay, 
                        pmc[2]+ Math.sin(angle*0.5)*bxminusax + Math.cos(angle*0.5)*byminusay], 
                        this.board);

        vecx = coords.usrCoords[1] - pmc[1];
        vecy = coords.usrCoords[2] - pmc[2];
    
        len = Math.sqrt(vecx*vecx+vecy*vecy);
        vecx = vecx*(len+dx)/len;
        vecy = vecy*(len+dy)/len;

        return new JXG.Coords(JXG.COORDS_BY_USER, [pmc[1]+vecx,pmc[2]+vecy],this.board);
    };

    el.prepareUpdate().update();
    
    return el;
};

JXG.JSXGraph.registerElement('sector', JXG.createSector);


/**
 * Creates a new circumcircle sector through three defining points.
 * @param {JXG.Board} board The board the sector is put on.
 * @param {Array} parents Array of three points defining the circumcircle sector.
 * @param {Object} attributs Object containing properties for the element such as stroke-color and visibility. See @see JXG.GeometryElement#setProperty
 * @type JXG.Sector
 * @return Reference to the created arc object.
 */
 JXG.createCircumcircleSector = function(board, parents, attributes) {
    var el, mp, idmp='', det;
    
    attributes = JXG.checkAttributes(attributes,{withLabel:JXG.readOption(board.options,'sector','withLabel'), layer:null});
    if(attributes['id'] != null) {
        idmp = attributes['id']+'_mp';
    }
    
    // Alles 3 Punkte?
    if ( (JXG.isPoint(parents[0])) && (JXG.isPoint(parents[1])) && (JXG.isPoint(parents[2]))) {
        mp = board.create('circumcirclemidpoint',[parents[0], parents[1], parents[2]], {id:idmp, withLabel:false, visible:false});
        attributes.useDirection = true;
        el = board.create('sector', [mp,parents[0],parents[2],parents[1]], attributes);
    } // Ansonsten eine fette Exception um die Ohren hauen
    else
        throw new Error("JSXGraph: Can't create circumcircle sector with parent types '" + (typeof parents[0]) + "' and '" + (typeof parents[1]) + "' and '" + (typeof parents[2]) + "'.");

    return el;
};

JXG.JSXGraph.registerElement('circumcirclesector', JXG.createCircumcircleSector);


/**
 * Creates a new angle.
 * @param {JXG.Board} board The board the angle is put on.
 * @param {Array} parents Array of three points defining the angle.
 * @param {Object} attributes Object containing properties for the element such as stroke-color and visibility. @see JXG.GeometryElement#setProperty
 * @type JXG.Angle
 * @return Reference to the created angle object.
 */
JXG.createAngle = function(board, parents, attributes) {
    var el, p, defaults, options, key, text,
        possibleNames = ['&alpha;', '&beta;', '&gamma;', '&delta;', '&epsilon;', '&zeta;', '&eta', '&theta;',
                                '&iota;', '&kappa;', '&lambda;', '&mu;', '&nu;', '&xi;', '&omicron;', '&pi;', '&rho;', 
                                '&sigmaf;', '&sigma;', '&tau;', '&upsilon;', '&phi;', '&chi;', '&psi;', '&omega;'],
        i = 0,
        j, x, pre, post, found;


    defaults = {withLabel:JXG.readOption(board.options,'elements','withLabel'), 
                layer:JXG.readOption(board.options,'layer','angle'),
                radius:JXG.readOption(board.options,'angle','radius'),
                text:''};
    options = board.options.angle;
    for (key in options) {
        defaults[key] = options[key];
    }
    attributes = JXG.checkAttributes(attributes, defaults);
    
    // Alles 3 Punkte?
    if ( (JXG.isPoint(parents[0])) && (JXG.isPoint(parents[1])) && (JXG.isPoint(parents[2]))) {
        //  If empty, create a new name
        text = attributes.text;
        if(text == '') {
            while(i < possibleNames.length) {
                j=i;
                x = possibleNames[i];
                for(el in board.objects) {
                    if(board.objects[el].type == JXG.OBJECT_TYPE_ANGLE) {
                        if(board.objects[el].text == x) {
                            i++;
                            break;
                        }
                    }
                }
                if(i==j) {
                    text = x;
                    i = possibleNames.length+1;
                }
            }
            if(i == possibleNames.length) {
                pre = '&alpha;_{';
                post = '}';
                found = false;
                j=0;
                while(!found) {
                    for(el in board.objects) {
                        if(board.objects[el].type == JXG.OBJECT_TYPE_ANGLE) {
                            if(board.objects[el].text == (pre+j+post)) {
                                found = true;
                                break;
                            }
                        }
                    }
                    if(found) {
                        found= false;
                    }
                    else {
                        found = true;
                        text = (pre+j+post);
                    }
                }
            }
        }

        p = board.create('point', [
            function(){
                var A = parents[0], B = parents[1],
                    r = attributes.radius,
                    d = B.Dist(A);
                    return [B.X()+(A.X()-B.X())*r/d,B.Y()+(A.Y()-B.X())*r/d];
            }], {withLabel:false, visible:false});
            
        attributes.name = text;
        el = board.create('sector', [parents[1],p,parents[2]],attributes);
        el.type = JXG.OBJECT_TYPE_ANGLE;
        el.text = text;
        parents[0].addChild(el);
        
    /**
    * return LabelAnchor
    */
    el.getLabelAnchor = function() {
        var angle = this.board.algebra.rad(this.point2, this.point1, this.point3),
            dx = 10/(this.board.stretchX),
            dy = 10/(this.board.stretchY),
            p2c = this.point2.coords.usrCoords,
            pmc = this.point1.coords.usrCoords,
            bxminusax = p2c[1] - pmc[1],
            byminusay = p2c[2] - pmc[2],
            coords, vecx, vecy, len;

        if(this.label.content != null) {                          
            this.label.content.relativeCoords = new JXG.Coords(JXG.COORDS_BY_USER, [0/(this.board.stretchX),0/(this.board.stretchY)],this.board);                      
        }  

        coords = new JXG.Coords(JXG.COORDS_BY_USER, 
                        [pmc[1]+ Math.cos(angle*0.5*1.125)*bxminusax - Math.sin(angle*0.5*1.125)*byminusay, 
                        pmc[2]+ Math.sin(angle*0.5*1.125)*bxminusax + Math.cos(angle*0.5*1.125)*byminusay], 
                        this.board);

        vecx = coords.usrCoords[1] - pmc[1];
        vecy = coords.usrCoords[2] - pmc[2];
    
        len = Math.sqrt(vecx*vecx+vecy*vecy);
        vecx = vecx*(len+dx)/len;
        vecy = vecy*(len+dy)/len;

        return new JXG.Coords(JXG.COORDS_BY_USER, [pmc[1]+vecx,pmc[2]+vecy],this.board);
    };

    } // Ansonsten eine fette Exception um die Ohren hauen
    else
        throw new Error("JSXGraph: Can't create angle with parent types '" + (typeof parents[0]) + "' and '" + (typeof parents[1]) + "' and '" + (typeof parents[2]) + "'.");

    return el;
};

JXG.JSXGraph.registerElement('angle', JXG.createAngle);

