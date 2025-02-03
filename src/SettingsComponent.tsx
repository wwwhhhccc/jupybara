// SettingsComponent.tsx
import React from 'react';
import { Container, Row, Col, Form } from 'react-bootstrap';

interface SettingsComponentProps {
  EDAMultiAgent: boolean;
  setEDAMultiAgent: (value: boolean) => void;
  storyMultiAgent: boolean;
  setStoryMultiAgent: (value: boolean) => void;
  EDAMaxRounds: string;
  setEDAMaxRounds: (value: string) => void;
  StoryMaxRounds: string;
  setStoryMaxRounds: (value: string) => void;
  agent1Model: string;
  setAgent1Model: (value: string) => void;
  planModel: string;
  setPlanModel: (value: string) => void;
  codeModel: string;
  setCodeModel: (value: string) => void;
  visModel: string;
  setVisModel: (value: string) => void;
  interpretModel: string;
  setInterpretModel: (value: string) => void;
  EDARefinerModel: string;
  setEDARefinerModel: (value: string) => void;
  clarifyModel: string;
  setClarifyModel: (value: string) => void;
  storyInitiatorModel: string;
  setStoryInitiatorModel: (value: string) => void;
  semanticModel: string;
  setSemanticModel: (value: string) => void;
  rhetoricalModel: string;
  setRhetoricalModel: (value: string) => void;
  pragmaticModel: string;
  setPragmaticModel: (value: string) => void;
  storyRefinerModel: string;
  setStoryRefinerModel: (value: string) => void;
  storyFeedbackHandlerModel: string;
  setStoryFeedbackHandlerModel: (value: string) => void;
}

const SettingsComponent: React.FC<SettingsComponentProps> = ({
  EDAMultiAgent,
  setEDAMultiAgent,
  storyMultiAgent,
  setStoryMultiAgent,
  EDAMaxRounds,
  setEDAMaxRounds,
  StoryMaxRounds,
  setStoryMaxRounds,
  agent1Model,
  setAgent1Model,
  planModel,
  setPlanModel,
  codeModel,
  setCodeModel,
  visModel,
  setVisModel,
  interpretModel,
  setInterpretModel,
  EDARefinerModel,
  setEDARefinerModel,
  clarifyModel,
  setClarifyModel,
  storyInitiatorModel,
  setStoryInitiatorModel,
  semanticModel,
  setSemanticModel,
  rhetoricalModel,
  setRhetoricalModel,
  pragmaticModel,
  setPragmaticModel,
  storyRefinerModel,
  setStoryRefinerModel,
  storyFeedbackHandlerModel,
  setStoryFeedbackHandlerModel
}) => {
  const modelOptions = [
    { value: 'gpt4o', label: 'GPT-4o' },
    { value: 'claude', label: 'Claude Sonnet 3.5' },
  ];

  const roundOptions = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
  ];

  return (
    <Container fluid className="px-3" style={{padding: "20px"}}>
      {/* <Row className="mb-3">
        <Col>
          <Form.Group>
            <Form.Label>Clarifier</Form.Label>
            <Form.Select value={clarifyModel} onChange={(e) => setClarifyModel(e.target.value)}>
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>
      <Row className="mb-3">
        <Col>
          <Form.Group>
            <Form.Label>Story Feedback Handler</Form.Label>
            <Form.Select value={storyFeedbackHandlerModel} onChange={(e) => setStoryFeedbackHandlerModel(e.target.value)}>
              {modelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </Col>
      </Row> */}
      <Row className="mb-3">
        <Col xs={12} className="d-flex align-items-center">
          <Form.Label htmlFor="eda-multi-agent-switch" className="mb-0 me-3">
            EDA Multi-Agent
          </Form.Label>
          <Form.Check 
            type="switch"
            id="eda-multi-agent-switch"
            checked={EDAMultiAgent}
            onChange={(e) => setEDAMultiAgent(e.target.checked)}
          />
        </Col>
      </Row>
      {EDAMultiAgent ? (
        <>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Initial Respondent</Form.Label>
                <Form.Select value={agent1Model} onChange={(e) => setAgent1Model(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Analysis Plan Critic</Form.Label>
                <Form.Select value={planModel} onChange={(e) => setPlanModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Code Critic</Form.Label>
                <Form.Select value={codeModel} onChange={(e) => setCodeModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Visualization Critic</Form.Label>
                <Form.Select value={visModel} onChange={(e) => setVisModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Interpretation Critic</Form.Label>
                <Form.Select value={interpretModel} onChange={(e) => setInterpretModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Refiner</Form.Label>
                <Form.Select value={EDARefinerModel} onChange={(e) => setEDARefinerModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>EDA Agent Discussion Max Round</Form.Label>
                <Form.Select value={EDAMaxRounds} onChange={(e) => setEDAMaxRounds(e.target.value)}>
                  {roundOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </>
      ) : (
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label>EDA Model</Form.Label>
              <Form.Select value={agent1Model} onChange={(e) => setAgent1Model(e.target.value)}>
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      )}
      <Row className="mb-3">
        <Col xs={12} className="d-flex align-items-center">
          <Form.Label htmlFor="story-multi-agent-switch" className="mb-0 me-3">
            Data Storytelling Multi-Agent
          </Form.Label>
          <Form.Check 
            type="switch"
            id="story-multi-agent-switch"
            checked={storyMultiAgent}
            onChange={(e) => setStoryMultiAgent(e.target.checked)}
          />
        </Col>
      </Row>
      {storyMultiAgent ? (
        <>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Initial Respondent</Form.Label>
                <Form.Select value={storyInitiatorModel} onChange={(e) => setStoryInitiatorModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Semantic Dimension Critic</Form.Label>
                <Form.Select value={semanticModel} onChange={(e) => setSemanticModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Rhetorical Dimension Critic</Form.Label>
                <Form.Select value={rhetoricalModel} onChange={(e) => setRhetoricalModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Pragmatic Dimension Critic</Form.Label>
                <Form.Select value={pragmaticModel} onChange={(e) => setPragmaticModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Data Story Refiner</Form.Label>
                <Form.Select value={storyRefinerModel} onChange={(e) => setStoryRefinerModel(e.target.value)}>
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          <Row className="mb-3">
            <Col>
              <Form.Group>
                <Form.Label>Data Storytelling Agent Discussion Max Round</Form.Label>
                <Form.Select value={StoryMaxRounds} onChange={(e) => setStoryMaxRounds(e.target.value)}>
                  {roundOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </>
      ) : (
        <Row className="mb-3">
          <Col>
            <Form.Group>
              <Form.Label>Data Storyteller</Form.Label>
              <Form.Select value={storyInitiatorModel} onChange={(e) => setStoryInitiatorModel(e.target.value)}>
                {modelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>
      )}
    </Container>
  );
};

export default SettingsComponent;