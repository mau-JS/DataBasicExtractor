const express = require('express');
const bodyParser = require('body-parser');
const { DocumentProcessorServiceClient } = require('@google-cloud/documentai').v1;
const fs = require('fs');
const app = express();

app.use(bodyParser.json());

app.get('/', (req, res) => {
    res.send('Hello, world!');
});

app.get('/favicon.ico', (req, res) => {
    res.sendStatus(204);
});

app.post('/webhook', async (req, res) => {
    const filePath = '1_updated_ConstanciaFiscalOECG.pdf';
    const projectId = 'documentprincipal';
    const location = 'us';
    const processorId = '3f7983dcf3c6d6c6';

    const document = await processDocument(projectId, location, processorId, filePath);
    console.log(document);

    // Extract key-value pairs from the document
    const keyValuePairs = document.pages.flatMap(page => {
        return page.formFields.map(field => {
            const fieldName = field.fieldName.textAnchor.content.replace(/\n/g, ' ').trim();
            const fieldValue = field.fieldValue.textAnchor.content.replace(/\n/g, ' ').trim();
            return `${fieldName}: ${fieldValue}`;
        });
    });

    // Create a Dialogflow-compatible response
    const dialogflowResponse = {
        fulfillmentMessages: [
            {
                text: {
                    text: [
                        `${keyValuePairs.join(', ')}.`
                    ]
                }
            }
        ]
    };

    res.json(dialogflowResponse);
});

async function processDocument(projectId, location, processorId, filePath) {
    const documentaiClient = new DocumentProcessorServiceClient();
    const resourceName = documentaiClient.processorPath(projectId, location, processorId);
    const imageFile = fs.readFileSync(filePath);
    const extension = filePath.split('.').pop();
    let mimeType;
    switch (extension) {
        case 'pdf':
            mimeType = 'application/pdf';
            break;
        case 'png':
            mimeType = 'image/png';
            break;
        case 'jpg':
        case 'jpeg':
            mimeType = 'image/jpeg';
            break;
        case 'tiff':
            mimeType = 'image/tiff';
            break;
        default:
            throw new Error(`Unsupported file extension: ${extension}`);
    }
    const rawDocument = {
        content: imageFile,
        mimeType: mimeType,
    };
    const request = {
        name: resourceName,
        rawDocument: rawDocument
    };
    const [result] = await documentaiClient.processDocument(request);
    return result.document;
}

app.listen(3000, () => {
    console.log('Webhook is running on port 3000');
});
