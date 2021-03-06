import express from 'express';
import jwt from 'jsonwebtoken';
import swaggerUI from 'swagger-ui-express';
import { Model, Database, Middleware, AuthenticationType, AuthenticationConfiguration, JwtConfiguration } from '../definitions';
import requestHandlers from './requestHandlers';
import generateDocs from './generateDocs';

export default async (configuration: {
    database: Database,
    authentication: {
        type: AuthenticationType,
        middleware: Middleware,
        configuration: AuthenticationConfiguration,
    },
    models: Model[],
    port: number,
}) : Promise<void> => {

    // Init
    const app = express();
    app.use(express.json());

    // Auth
    app.use(configuration.authentication.middleware);
    if(configuration.authentication.type === AuthenticationType.JWT) {
        const jwtConfiguration = configuration.authentication.configuration as JwtConfiguration;
        app.post(jwtConfiguration.authEndpoint, async(req, res) => {
            try {
                await jwtConfiguration.authCheck(
                    req,
                    async (userData?: { [key: string]: any; }) => {
                        const token = jwt.sign(userData || {}, jwtConfiguration.secret, { expiresIn: (jwtConfiguration.tokenExpirationMS || 360000) / 1000 });
                        res.status(200).send({
                            token,
                            userData,
                        });
                    },
                    async () => {
                        res.status(401).send('Authentication failed');
                    },
                );
            } catch(e) {
                res.status(401).send('Unexpected error when authenticating');
            }
        });
    }
    if(configuration.authentication.type === AuthenticationType.PUBLIC) {
        console.info(`No authentication, all endpoints are public ⚠️`)
    }
    else {
        console.info(`Authentication type ${configuration.authentication.type} enabled 🔒`)
    }

    // Models
    configuration.models.forEach(model => {
        app.get(`/${model.name}/:id`, requestHandlers.getById(model, configuration.database));
        app.get(`/${model.name}`, requestHandlers.getMany(model, configuration.database));
        app.post(`/${model.name}`, requestHandlers.post(model, configuration.database));
        app.put(`/${model.name}/:id`, requestHandlers.put(model, configuration.database));
        app.patch(`/${model.name}/:id`, requestHandlers.patch(model, configuration.database));
        app.delete(`/${model.name}/:id`, requestHandlers.del(model, configuration.database));
        console.info(`Serving JSON schema: ${model.name} ☑`);
    });

    // Docs
    app.get('/', swaggerUI.serve, swaggerUI.setup(generateDocs(configuration.models)));

    // Startup
    app.listen(configuration.port, () => {
        console.info(`Listening at port ${configuration.port} ⚡`);
    });
};