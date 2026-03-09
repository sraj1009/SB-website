import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SINGGLEBEE API Documentation',
            version: '1.0.0',
            description: 'API documentation for the SINGGLEBEE e-commerce platform.',
            contact: {
                name: 'SINGGLEBEE Support',
                url: 'https://singglebee.com/support',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./routes/api/v1/*.js', './models/*.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
