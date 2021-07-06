import Ajv from "ajv"
import addFormats from "ajv-formats"
import { nanoid } from 'nanoid'
import $RefParser from "@apidevtools/json-schema-ref-parser";

import treeSchema from "./schemata/tree.json"

const initSchema = {'v':'0.1-alpha'}
const toReadable = [
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/trees.json",
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/location.json",
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/coordinates.json",
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/measurements.json",
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/dbh.json",
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/diameter_height.json",
    //"https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/height.json"
];

class VinvParser {
    
    constructor(file) {
        this.ajv = new Ajv({
            allErrors: true, 
            verbose: true
        });
        this._triggers = {}

        addFormats(this.ajv);
        
        this._createInv(file);
        
    }
    
    _createInv(file){
        if(typeof file === 'string') this.inv = this._tryParseJson(file)
        else if(typeof file === 'object') this.inv = file
        else this.inv = initSchema;

        if(!this.inv.v) throw "vinv-js: Version identifier is missing";

        this._addSchema(this.inv.v);
        if(!this._validate('vinv.json', this.inv))
            throw "vinv-js: Not a valid vinv object";

        this._triggerHandler('change', this.inv);
    }
    _addSchema(version) {
        this.ajv.removeSchema()
        switch (version) {
            case '0.1-alpha':
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/vinv.json"), 'vinv.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/trees.json"), 'trees.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/location.json"), 'location.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/species.json"), 'species.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/height.json"), 'height.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/filter.json"), 'filter.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/diameter_height.json"), 'diameter_height.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/fallbacks.json"), 'fallbacks.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/dbh.json"), 'dbh.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/changes.json"), 'changes.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/coordinates.json"), 'coordinates.json')
                this.ajv.addSchema(require("vinv-schema/0.1-alpha/definitions/measurements.json"), 'measurements.json')
        }
    }
    _validate(schema, data){
        return this.ajv.validate(schema, data);
    }
    get getVinv() {
      return JSON.stringify(this.inv);
    }
    get getTreeSchema() {
        return require("vinv-schema/0.1-alpha/definitions/trees.json");
    }
    async getTreeSchemaAsync(){
        const tmp = await $RefParser.dereference('https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/trees.json');
        return {
            "type": "object",
            "additionalProperties": false,
            "properties":{
                "tree": tmp
            }
        };
    }
    /*toReadableSchema(schema){

        if(schema.$id && toReadable.includes(schema.$id)){
            console.log(schema.title);
            schema.required = [];
            schema.type = 'object';

            schema.properties = {};
            for(let i=0; i < schema.items.length; i++){
                if(schema.$id == 'https://raw.githubusercontent.com/vinv-group/vinv-schema/alpha/0.1-alpha/definitions/trees.json')

                if(schema.minItems && i+1 <= schema.minItems ) {
                    schema.required.push(i.toString());
                }
                schema.properties[i] = this.toReadableSchema(schema.items[i]);
            }

            delete schema.items;

            if(schema.additionalItems) {
                schema.additionalProperties = schema.additionalItems;
                

            }
            
            delete schema.additionalItems;
            
        }
        
        return schema;
    }*/
    on(event, callback){
        if(!this._triggers[event]) this._triggers[event] = [];
        this._triggers[event].push( callback );
    }
    _triggerHandler(event, params) {
        if( this._triggers[event] ) {
            for( var i in this._triggers[event] )
            this._triggers[event][i](params);
        }
    }
    _tryParseJson(jsonString){
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('not valid json', jsonString);
            return initSchema;
        }
    }
/**
     * Adds a Tree.
     * @constructor
     * @param {string} attributes - The title of the book.
     * @param {string} id - The author of the book.
     */
    _triggerChange(){
        console.log('triggered');
        this._triggerHandler('change', this.inv);
    }
    addTree(attributes, id) {
        if(!this._validate({$ref:"trees.json"}, attributes)){
            console.error('attributes not ok: ', this.ajv.errors);
            return false;
        }
        if(!this.inv.trees) this.inv.trees = [{},[]];

        const treeId = id || nanoid();
        if(treeId in this.inv.trees[0]) {
            console.error("vinv-js: id \'" + treeId + "\' already exists");
            return false;
        }

        this.inv.trees[0][id || nanoid()] = attributes;
        this._triggerHandler('change', this.inv);

        if(!this._validate('vinv.json', this.inv)){
            console.error("vinv-js: Not a valid vinv object", this.ajv.errors);
        }

        return true;
    }
    _download() {
        const data = this.getVinv;
        console.log(data);
        const filename = 'virtual-inventory-' + new Date().toJSON().slice(0,10) + '.vinv';
        const type = 'application/json';

        var file = new Blob([data], {type: type});
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(file, filename);
        }else { // Others
            var a = document.createElement("a"), url = URL.createObjectURL(file);
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);  
            }, 0); 
        }
    }
    _mergeFile(file){
        const that = this;
        var reader = new FileReader();
        reader.onload = (evt) => that._createInv(evt.target.result)
        
        reader.readAsText(file);
    }
    _handleFile(event) {
        var filesArray = event.target.files;
        for (var i=0; i<filesArray.length; i++) {
            this._mergeFile(filesArray[i]);
        }
    }
    uploadBtn() {
        const that = this;
       
        const input = document.createElement("input");
        input.type = "file";
        input.id = 'fileInput';
        input.style.display = "none";
        input.accept = ".vinv";
        input.addEventListener("change", (e) => that._handleFile(e), false);
        return input;
    }
    downloadBtn(){
        const that = this;
       
        const input = document.createElement("button");
        input.type = "button";
        input.innerHTML = 'Download';
        input.addEventListener("click", (e) => that._download(e), false);
        return input;
    }
}
  
export default VinvParser;