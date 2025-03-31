# OW Match Log 

a tool to log your overwatch 2 match history using OCR and large language models.

## Getting Started

to be written

## Selecting a Model

The LLM is used to organize OCR output into a structured format. This process is critical to the usability of this tool. Data that is malformed, or misinterpreted by the LLM will cause unexpected states. 

Any model available using the OpenAI API can be used. They must support structured outputs. 

### OpenAI

gpt-4o and gpt-4o-mini perform well for accurately organizing the OCR output. Mini is preferred as the cost is very low. 

### Grok

Grok2 and Grok3 show accuracy issues and are not recommended. These models are significantly more expensive than 

### Local Models

It is possible to use a local model using Ollama, but the accuracy will not be as good as a much larger model from an LLM provider. When seleting a local model, prefer models that excel at structured outputs, and prompt adherance. 

## Cost

The token usage of the LLM is approximately 700 prompt tokens, and 300 completion tokens. These values can vary based on the OCR results. 

Using gpt-4o-mini, this cost is $0.008 USD per query. If you do this daily, the total cost would be $0.48 USD for a whole season (60 days)

## Security

this application is NOT secure. I have put 0 effort into securing this application. 

Possible attack vectors:

- SQL injection into the matches database
- OpenAI API prompt injection
- Shell command injection

Use this on your local network only, or on a server that is expendable.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details

