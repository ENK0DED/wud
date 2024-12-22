const { byValues, byString } = require('sort-es');

const express = require('express');
const nocache = require('nocache');
const registry = require('../registry');

/**
 * Map a Component to a displayable (api/ui) item.
 * @param key
 * @param component
 * @returns {{id: *}}
 */
function mapComponentToItem(key, component) {
    return {
        id: key,
        type: component.type,
        name: component.name,
        configuration: component.maskConfiguration(),
    };
}

/**
 * Return a list instead of a map.
 * @param listFunction
 * @returns {{id: string}[]}
 */
function mapComponentsToList(components) {
    return Object.keys(components)
        .map((key) => mapComponentToItem(key, components[key]))
        .sort(
            byValues([
                [(x) => x.type, byString()],
                [(x) => x.name, byString()],
            ]),
        );
}

/**
 * Get all components.
 * @param req
 * @param res
 */
function getAll(req, res, kind) {
    res.status(200).json(mapComponentsToList(registry.getState()[kind]));
}

/**
 * Get a component by id.
 * @param req
 * @param res
 * @param listFunction
 */
function getById(req, res, kind) {
    const { type, name } = req.params;
    const id = `${type}.${name}`;
    const component = registry.getState()[kind][id];
    if (component) {
        res.status(200).json(mapComponentToItem(id, component));
    } else {
        res.sendStatus(404);
    }
}

/**
 * Init the component router.
 * @param kind
 * @returns {*|Router}
 */
function init(kind) {
    const router = express.Router();
    router.use(nocache());
    router.get('/', (req, res) => getAll(req, res, kind));
    router.get('/:type/:name', (req, res) => getById(req, res, kind));
    return router;
}

module.exports = {
    init,
    mapComponentsToList,
    getById,
};
