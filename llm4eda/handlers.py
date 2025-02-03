import json
import requests
from jupyter_server.base.handlers import APIHandler
from jupyter_server.utils import url_path_join
import tornado
import os
from tornado.web import StaticFileHandler, authenticated
from tornado.httpclient import AsyncHTTPClient, HTTPRequest
import openai
from dotenv import load_dotenv
import anthropic
import concurrent.futures


load_dotenv()
openai_api_key = os.getenv('OPENAI_API_KEY')
claude_api_key = os.getenv('CLAUDE_API_KEY')

print("openai", openai_api_key)

if not openai_api_key:
    raise ValueError("No Openai API key found. Please check your .env file.")
if not claude_api_key:
    raise ValueError("No Claude API key found. Please check your .env file.")

openai.api_key = openai_api_key
openai_client = openai.OpenAI()
anthropic_client = anthropic.Anthropic(api_key=claude_api_key)

LLM = "GPT-4o"
# LLM = "claude"
TEMPERATURE = 0.1


current_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(current_dir, '../prompts/system/main_area_agent1.txt')
with open(file_path, 'r') as file:
    MAIN_AREA_AGENT1 = file.read()

file_path = os.path.join(current_dir, '../prompts/system/main_area_agent2.txt')
with open(file_path, 'r') as file:
    MAIN_AREA_AGENT2 = file.read()

file_path = os.path.join(current_dir, '../prompts/system/main_area_agent3.txt')
with open(file_path, 'r') as file:
    MAIN_AREA_AGENT3 = file.read()

file_path = os.path.join(current_dir, '../prompts/system/plan.txt')
with open(file_path, 'r') as file:
    PLAN = file.read()

file_path = os.path.join(current_dir, '../prompts/system/code.txt')
with open(file_path, 'r') as file:
    CODE = file.read()

file_path = os.path.join(current_dir, '../prompts/system/vis.txt')
with open(file_path, 'r') as file:
    VIS = file.read()

file_path = os.path.join(current_dir, '../prompts/system/interpret.txt')
with open(file_path, 'r') as file:
    INTERPRET = file.read()

file_path = os.path.join(current_dir, '../prompts/system/refiner2.txt')
with open(file_path, 'r') as file:
    REFINER2 = file.read()

file_path = os.path.join(
    current_dir, '../prompts/system/clarify_system_prompt.txt')
with open(file_path, 'r') as file:
    CLARIFY_SYSTEM_PROMPT = file.read()

file_path = os.path.join(current_dir, '../prompts/system/insights.txt')
with open(file_path, 'r') as file:
    INSIGHTS_SYSTEM_PROMPT = file.read()

file_path = os.path.join(current_dir, '../prompts/system/link_to_cell.txt')
with open(file_path, 'r') as file:
    LINK_TO_CELL_SYSTEM_PROMPT = file.read()

file_path = os.path.join(
    current_dir, '../prompts/system/storytelling_generation.txt')
with open(file_path, 'r') as file:
    STORYTELLING_SYSTEM_PROMPT = file.read()

file_path = os.path.join(current_dir, '../prompts/system/semantic.txt')
with open(file_path, 'r') as file:
    SEMANTIC_SYSTEM_PROMPT = file.read()

file_path = os.path.join(current_dir, '../prompts/system/rhetorical.txt')
with open(file_path, 'r') as file:
    RHETORICAL_SYSTEM_PROMPT = file.read()

file_path = os.path.join(current_dir, '../prompts/system/pragmatic.txt')
with open(file_path, 'r') as file:
    PRAGMATIC_SYSTEM_PROMPT = file.read()

file_path = os.path.join(current_dir, '../prompts/system/story_refiner.txt')
with open(file_path, 'r') as file:
    STORY_REFINER_SYSTEM_PROMPT = file.read()

file_path = os.path.join(
    current_dir, '../prompts/system/story_feedback_handler.txt')
with open(file_path, 'r') as file:
    FEEDBACK_HANDLER_SYSTEM_PROMPT = file.read()

file_path = os.path.join(
    current_dir, '../prompts/user/insight_1.txt')
with open(file_path, 'r') as file:
    INSIGHT_USER_PROMPT1 = file.read()
    
file_path = os.path.join(
    current_dir, '../prompts/user/insight_2.txt')
with open(file_path, 'r') as file:
    INSIGHT_USER_PROMPT2 = file.read()

def strip_extra_content(text):
    start = text.find('{')
    end = text.rfind('}')
    if start != -1 and end != -1 and start < end:
        return text[start:end+1]
    return text



class RouteHandler(APIHandler):

    CONFIG = {
        "AGENT_MODELS": {
            "agent1": "GPT-4o",
            "plan": "GPT-4o",
            "code": "GPT-4o",
            "vis": "GPT-4o",
            "interpret": "GPT-4o",
            "refiner2": "GPT-4o",
            "clarify": "GPT-4o",
            "story-initiator": "GPT-4o",
            "semantic": "GPT-4o",
            "rhetorical": "GPT-4o",
            "pragmatic": "GPT-4o",
            "story-refiner": "GPT-4o",
            "story_feedback_handler": "GPT-4o"
        },
        "EDA_MULTI_AGENT": True,
        "DATA_STORY_MULTI_AGENT": True,
        "EDA_MAX_ROUND": 2,
        "DATA_STORY_MAX_ROUND": 2
    }

    @classmethod
    def set_config(cls, new_config):
        if not isinstance(new_config, dict):
            raise ValueError("Configuration should be a dictionary.")
        cls.CONFIG = new_config
        # print("^"*30)
        # print(RouteHandler.CONFIG)
        # print("^"*30)

    @tornado.web.authenticated
    def get(self):
        self.finish(json.dumps(
            {"data": "This is /llm4eda/get-example endpoint!"}))

    @tornado.web.authenticated
    def post(self):

        input_data = self.get_json_body()
        request_type = input_data.get("request_type")

        if "request_type" not in input_data:
            self.set_status(400)
            self.finish(json.dumps(
                {"status": "error", "message": "Missing 'request_type' field in input data"}))
            return

        cell_contents = input_data.get("cells", [])

        if request_type == "main_area":
            self.main_area_handler(cell_contents)
        elif request_type == "clarify":
            msgs = input_data.get("conversation_history", [])
            selected_cell = input_data.get("selected_cell", "")
            self.clarify_handler(cell_contents, msgs, selected_cell)
        elif request_type == "set_config":
            new_config = input_data.get("config")
            if new_config is not None:
                self.set_config(new_config)
                self.finish(json.dumps(
                    {"status": "success", "message": "new config set" + str(new_config)}))
            else:
                self.finish(json.dumps(
                    {"status": "error", "message": "config obj has errors"}))
        elif request_type == "summarize_insights":
            self.summarize_insights(cell_contents)
        elif request_type == "link_to_cell":
            self.link_to_cell(input_data)
        elif request_type == "generate_story":
            user_instructions = input_data.get("user_instructions")
            self.generate_story(cell_contents, user_instructions)
        elif request_type == "submit_feedback":
            self.story_handle_feedback(input_data)

    def story_handle_feedback(self, input_data):
        cell_contents = input_data["cells"]
        user_instructions = input_data["user_instructions"]
        story_content = input_data["story_content"]
        global_feedback = input_data["global_feedback"]
        quote_feedback = input_data["quote_feedback"]
        try:
            if RouteHandler.CONFIG["AGENT_MODELS"]["story_feedback_handler"] == "GPT-4o":
                print("calling gpt...")
                messages = [
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "text",
                                "text": FEEDBACK_HANDLER_SYSTEM_PROMPT,
                            }
                        ]
                    },
                    {
                        "role": "user",
                        "content": []
                    }
                ]
                self.process_cells(cell_contents, messages[1], "GPT-4o")
                if user_instructions:
                    messages[1]["content"].append(
                        {"type": "text", "text": user_instructions})
                messages[1]["content"].append(
                    {"type": "text", "text": "The current data story is:\n" + story_content})
                if global_feedback:
                    messages[1]["content"].append(
                        {"type": "text", "text": "Here is the user's global feedback:\n" + global_feedback})
                if len(quote_feedback):
                    messages[1]["content"].append(
                        {"type": "text", "text": "Here is the user's feedback on specific parts of the data story:"})
                    for feedback in quote_feedback:
                        messages[1]["content"].append(
                            {"type": "text", "text": "About " + feedback["quoted_text"] + ", the user says: " + feedback["feedback"]})
                completion = openai_client.chat.completions.create(
                    model="gpt-4o-2024-08-06",
                    temperature=0,
                    messages=messages
                )
                result = completion.choices[0].message.content
                print(result)
            elif RouteHandler.CONFIG["AGENT_MODELS"]["story_feedback_handler"] == "claude":
                print("calling claude...")
                messages = [{"role": "user", "content": []}]
                self.process_cells(cell_contents, messages[0], "claude")
                if user_instructions:
                    messages[0]["content"].append(
                        {"type": "text", "text": user_instructions})
                messages[0]["content"].append(
                    {"type": "text", "text": "The current data story is:\n" + story_content})
                if global_feedback:
                    messages[0]["content"].append(
                        {"type": "text", "text": "Here is the user's global feedback:\n" + global_feedback})
                if len(quote_feedback):
                    messages[0]["content"].append(
                        {"type": "text", "text": "Here is the user's feedback on specific parts of the data story:"})
                    for feedback in quote_feedback:
                        messages[0]["content"].append(
                            {"type": "text", "text": "About " + feedback["quoted_text"] + ", the user says: " + feedback["feedback"]})
                completion = anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    temperature=0,
                    system=FEEDBACK_HANDLER_SYSTEM_PROMPT,
                    max_tokens=4096,
                    messages=messages
                )
                result = ''.join([block.text for block in completion.content])
                print(result)
            self.finish(result)
        except Exception as e:
            self.handle_exception(e)

    def story_call_apis_in_parallel(self, msgs, system_prompts):
        with concurrent.futures.ThreadPoolExecutor() as executor:
            semantic = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "GPT-4o" else self.call_claude, msgs[0], system_prompts[0])
            rhetorical = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "GPT-4o" else self.call_claude, msgs[1], system_prompts[1])
            pragmatic = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "GPT-4o" else self.call_claude, msgs[2], system_prompts[2])

            semantic = semantic.result()
            rhetorical = rhetorical.result()
            pragmatic = pragmatic.result()

            semantic = semantic.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "GPT-4o" else ''.join([
                                                                                                                               block.text for block in semantic.content])
            rhetorical = rhetorical.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"][
                "rhetorical"] == "GPT-4o" else ''.join([block.text for block in rhetorical.content])
            pragmatic = pragmatic.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"][
                "pragmatic"] == "GPT-4o" else ''.join([block.text for block in pragmatic.content])

        return semantic, rhetorical, pragmatic

    def generate_story(self, cell_contents, user_instructions):
        print("generating story")
        if user_instructions:
            user_instructions = "Here is information the user provides on how you should generate the data story: " + user_instructions
            print(user_instructions)
        try:
            if RouteHandler.CONFIG["AGENT_MODELS"]["story-initiator"] == "GPT-4o":
                print("calling gpt...")
                messages = [
                    {
                        "role": "system",
                        "content": [
                            {
                                "type": "text",
                                "text": STORYTELLING_SYSTEM_PROMPT,
                            }
                        ]
                    },
                    {
                        "role": "user",
                        "content": []
                    }
                ]
                self.process_cells(cell_contents, messages[1], "GPT-4o")
                if user_instructions:
                    messages[1]["content"].append(
                        {"type": "text", "text": user_instructions})
                completion = openai_client.chat.completions.create(
                    model="gpt-4o-2024-08-06",
                    temperature=0,
                    messages=messages
                )
                result = completion.choices[0].message.content
                print(result)

            elif RouteHandler.CONFIG["AGENT_MODELS"]["story-initiator"] == "claude":
                print("calling claude...")
                messages = [{"role": "user", "content": []}]
                self.process_cells(cell_contents, messages[0], "claude")
                if user_instructions:
                    messages[0]["content"].append(
                        {"type": "text", "text": user_instructions})
                completion = anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    temperature=0,
                    system=STORYTELLING_SYSTEM_PROMPT,
                    max_tokens=4096,
                    messages=messages
                )
                result = ''.join([block.text for block in completion.content])
                print(result)
        except Exception as e:
            self.handle_exception(e)
        if not RouteHandler.CONFIG["DATA_STORY_MULTI_AGENT"]:
            self.finish(result)
        else:
            self.handle_data_story(cell_contents, result)

    def handle_data_story(self, cell_contents, completion_content):
        critic_refiner_history_gpt = [
            {"role": "assistant",
                "content": "Here is the initial response. Please critique it."},
            {"role": "assistant", "content": completion_content}
        ]
        critic_refiner_history_claude = [
            {"type": "text", "text": "Here is the initial response. Please critique it."},
            {"type": "text", "text": completion_content}
        ]

        # Semantic
        if RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "GPT-4o":
            semantic_msgs = [{"role": "system", "content": [
                {"type": "text", "text": SEMANTIC_SYSTEM_PROMPT}]}, {"role": "user", "content": []}]
            self.process_cells(cell_contents, semantic_msgs[1], "GPT-4o")
            semantic_msgs.extend(critic_refiner_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "claude":
            semantic_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, semantic_msgs[0], "claude")
            semantic_msgs[0]["content"].extend(critic_refiner_history_claude)

        # Rhetorical
        if RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "GPT-4o":
            rhetorical_msgs = [{"role": "system", "content": [
                {"type": "text", "text": RHETORICAL_SYSTEM_PROMPT}]}, {"role": "user", "content": []}]
            self.process_cells(cell_contents, rhetorical_msgs[1], "GPT-4o")
            rhetorical_msgs.extend(critic_refiner_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "claude":
            rhetorical_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, rhetorical_msgs[0], "claude")
            rhetorical_msgs[0]["content"].extend(critic_refiner_history_claude)

        # Pragmatic
        if RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "GPT-4o":
            pragmatic_msgs = [{"role": "system", "content": [
                {"type": "text", "text": PRAGMATIC_SYSTEM_PROMPT}]}, {"role": "user", "content": []}]
            self.process_cells(cell_contents, pragmatic_msgs[1], "GPT-4o")
            pragmatic_msgs.extend(critic_refiner_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "claude":
            pragmatic_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, pragmatic_msgs[0], "claude")
            pragmatic_msgs[0]["content"].extend(critic_refiner_history_claude)

        # Refiner
        if RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "GPT-4o":
            refiner_msgs = [{"role": "system", "content": [
                {"type": "text", "text": STORY_REFINER_SYSTEM_PROMPT}]}, {"role": "user", "content": []}]
            self.process_cells(cell_contents, refiner_msgs[1], "GPT-4o")
            refiner_msgs.extend(critic_refiner_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "claude":
            refiner_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, refiner_msgs[0], "claude")
            refiner_msgs[0]["content"].extend(critic_refiner_history_claude)

        i = 1
        while i <= RouteHandler.CONFIG["DATA_STORY_MAX_ROUND"]:
            ready = False
            semantic, rhetorical, pragmatic = self.story_call_apis_in_parallel([semantic_msgs, rhetorical_msgs, pragmatic_msgs], [
                                                                               SEMANTIC_SYSTEM_PROMPT, RHETORICAL_SYSTEM_PROMPT, PRAGMATIC_SYSTEM_PROMPT])
            critique = "Semantic Dimension Critique: " + semantic + "\n" + \
                "Rhetorical Dimension Critique: " + rhetorical + "\n" + \
                "Pragmatic Dimension Critique: " + pragmatic
            print(critique)
            if RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "GPT-4o":
                semantic_msgs.append(
                    {"role": "assistant", "content": critique})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "claude":
                semantic_msgs[0]["content"].append(
                    {"type": "text", "text": critique})
            if RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "GPT-4o":
                rhetorical_msgs.append(
                    {"role": "assistant", "content": critique})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "claude":
                rhetorical_msgs[0]["content"].append(
                    {"type": "text", "text": critique})
            if RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "GPT-4o":
                pragmatic_msgs.append(
                    {"role": "assistant", "content": critique})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "claude":
                pragmatic_msgs[0]["content"].append(
                    {"type": "text", "text": critique})
            if RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "GPT-4o":
                refiner_msgs.append({"role": "assistant", "content": critique})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "claude":
                refiner_msgs[0]["content"].append(
                    {"type": "text", "text": critique})
            print("-"*30)

            try:
                _ready = True
                for llm_response in (semantic, rhetorical, pragmatic):
                    response = strip_extra_content(llm_response)
                    response = json.loads(response)
                    _ready = _ready and response["response_ready"] and isinstance(
                        response["response_ready"], bool)
                ready = _ready
            except Exception as e:
                print("An execption occurred in determining if ready: " + str(e))
                ready = True

            if RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "GPT-4o":
                print("calling gpt4o")
                refine = openai_client.chat.completions.create(
                    model="gpt-4o-2024-08-06",
                    temperature=TEMPERATURE,
                    messages=refiner_msgs
                )
                refine = refine.choices[0].message.content
            elif RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "claude":
                print("calling claude")
                refine = anthropic_client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    temperature=TEMPERATURE,
                    system=STORY_REFINER_SYSTEM_PROMPT,
                    max_tokens=4096,
                    messages=refiner_msgs
                )
                refine = ''.join([block.text for block in refine.content])
            print("Refine:")
            print(refine)
            if RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "GPT-4o":
                semantic_msgs.append(
                    {"role": "assistant", "content": "Refiner: " + refine})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["semantic"] == "claude":
                semantic_msgs[0]["content"].append(
                    {"type": "text", "text": "Refiner: " + refine})
            if RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "GPT-4o":
                rhetorical_msgs.append(
                    {"role": "assistant", "content": "Refiner: " + refine})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["rhetorical"] == "claude":
                rhetorical_msgs[0]["content"].append(
                    {"type": "text", "text": "Refiner: " + refine})
            if RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "GPT-4o":
                pragmatic_msgs.append(
                    {"role": "assistant", "content": "Refiner: " + refine})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["pragmatic"] == "claude":
                pragmatic_msgs[0]["content"].append(
                    {"type": "text", "text": "Refiner: " + refine})
            if RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "GPT-4o":
                refiner_msgs.append(
                    {"role": "assistant", "content": "Refiner: " + refine})
            elif RouteHandler.CONFIG["AGENT_MODELS"]["story-refiner"] == "claude":
                refiner_msgs[0]["content"].append(
                    {"type": "text", "text": "Refiner: " + refine})
            print("="*30)
            # llm_response = strip_extra_content(refine)
            # response = json.loads(llm_response)
            if ready or i == RouteHandler.CONFIG["DATA_STORY_MAX_ROUND"]:
                print("&"*30)
                print("&"*30)
                # self.finish(json.dumps(response))
                self.finish(refine)
                break
            i += 1

    def link_to_cell(self, data, model="GPT-4o"):
        print("linking to cell")
        cell_contents = data["cells"]
        mermaid = data["mermaidChart"]
        elementText = data["elementText"]
        context = data["context"]
        node_or_edge = data["node_or_edge"]

        if model == "GPT-4o":
            print("calling gpt...")
            messages = [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": LINK_TO_CELL_SYSTEM_PROMPT,
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": []
                }
            ]
            self.process_cells(cell_contents, messages[1], "GPT-4o")
            messages[1]["content"].append(
                {"type": "text", "text": "The mermaid chart summarizing one of the analysis paths in the notebook is:\n" + mermaid})
            description = ""
            if node_or_edge == "node":
                description = f"is node {context} in the diagram "
            elif node_or_edge == "edge":
                description = f"is an edge and connects nodes {context} "
            print(description)
            messages[1]["content"].append({"type": "text", "text": f"The user clicked on a {node_or_edge}, which " + description + f"and has text {elementText}. \
                What is the cell number that best reflects the content clicked? Return the cell nunber only."})
            completion = openai_client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                temperature=0,
                messages=messages
            )
            result = completion.choices[0].message.content
            print(result)
        elif model == "claude":
            print("calling claude...")
            messages = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, messages[0], "claude")
            messages[0]["content"].append(
                {"type": "text", "text": "The mermaid chart summarizing one of the analysis paths in the notebook is:\n" + mermaid})
            description = ""
            if node_or_edge == "node":
                description = f"is node {context} in the diagram "
            elif node_or_edge == "edge":
                description = f"is an edge and connects nodes {context} "
            print(description)
            messages[0]["content"].append({"type": "text", "text": f"The user clicked on a {node_or_edge}, which " + description + f"and has text {elementText}. \
                Carefully read ALL cells from top to bottom, including cells in the middle. You should find the cell MOST relevant to the clicked element. \
                Code cell output counts as part of that cell too. If a code cell's output contains the most relevant information, select that code cell. \
                Return the cell nunber only."})
            completion = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                temperature=0,
                system=LINK_TO_CELL_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=messages
            )
            result = ''.join([block.text for block in completion.content])
            print(result)
        self.finish(str(result))

    def summarize_insights(self, cell_contents, model="claude"):
        print("summarizing insights")
        prompt1 = INSIGHT_USER_PROMPT1
        prompt2 = INSIGHT_USER_PROMPT2

        if model == "GPT-4o":
            print("calling gpt...")
            messages = [
                {
                    "role": "system",
                    "content": [
                        {
                            "type": "text",
                            "text": INSIGHTS_SYSTEM_PROMPT
                        }
                    ]
                },
                {
                    "role": "user",
                    "content": []
                }
            ]
            self.process_cells(cell_contents, messages[1], "GPT-4o")

            messages.append({"role": "user", "content": [
                            {"type": "text", "text": prompt1}]})
            completion = openai_client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                temperature=0,
                messages=messages
            )
            result = completion.choices[0].message.content
            messages.append({"role": "assistant", "content": [
                            {"type": "text", "text": result}]})
            print(result)
            print("%" * 50)
            messages.append({"role": "user", "content": [
                            {"type": "text", "text": prompt2}]})
            completion = openai_client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                temperature=TEMPERATURE,
                messages=messages
            )
            result = completion.choices[0].message.content
            print(result)
            self.finish(result)
        elif model == "claude":
            print("calling claude...")
            messages = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, messages[0], "claude")

            messages[0]["content"].append({"type": "text", "text": prompt1})

            completion = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                temperature=0,
                system=INSIGHTS_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=messages
            )

            result = ''.join([block.text for block in completion.content])
            messages.append({"role": "assistant", "content": [
                            {"type": "text", "text": result}]})
            print(result)
            print("%" * 50)
            messages.append({"role": "user", "content": [
                            {"type": "text", "text": prompt2}]})
            completion = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                temperature=0,
                system=INSIGHTS_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=messages
            )
            result = ''.join([block.text for block in completion.content])
            print(result)
            self.finish(result)

    def main_area_handler(self, cell_contents):
        if RouteHandler.CONFIG["AGENT_MODELS"]["agent1"] == "GPT-4o":
            self.main_area_call_gpt4o(cell_contents)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["agent1"] == "claude":
            self.main_area_call_claude(cell_contents)

    def clarify_handler(self, cell_contents, msgs, selected_cell):
        if RouteHandler.CONFIG["AGENT_MODELS"]["clarify"] == "GPT-4o":
            self.clarify_call_gpt4o(cell_contents, msgs, selected_cell)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["clarify"] == "claude":
            self.clarify_call_claude(cell_contents, msgs, selected_cell)

    def clarify_call_gpt4o(self, cell_contents, msgs, selected_cell):
        print("calling gpt...")
        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": CLARIFY_SYSTEM_PROMPT
                    }
                ]
            },
            {
                "role": "user",
                "content": []
            }
        ]
        try:
            self.process_cells(cell_contents, messages[1], "GPT-4o")

            messages[1]["content"].append(
                {"type": "text", "text": "Here is the cell the user has questions about. Note that the user may have modified its content to highlight their questions."})
            messages[1]["content"].append(
                {"type": "text", "text": selected_cell})
            messages[1]["content"].append(
                {"type": "text", "text": "Here are the user questions. Conversation history on this question is also provided."})

            for msg in msgs:
                messages[1]["content"].append(
                    {"type": "text", "text": f"{msg['sender']}: " + f"{msg['text']}"})

            completion = openai_client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                temperature=TEMPERATURE,
                messages=messages
            )

            print(completion.choices[0].message.content)

            self.clarify_handle_completion(
                completion.choices[0].message.content)
        except Exception as e:
            self.handle_exception(e)

    def clarify_call_claude(self, cell_contents, msgs, selected_cell):
        print("calling claude...")
        messages = [{"role": "user", "content": []}]
        try:
            self.process_cells(cell_contents, messages[0], "claude")

            messages[0]["content"].append(
                {"type": "text", "text": "Here is the cell the user has questions about. Note that the user may have modified its content to highlight their questions."})
            messages[0]["content"].append(
                {"type": "text", "text": selected_cell})
            messages[0]["content"].append(
                {"type": "text", "text": "Here are the user questions. Conversation history on this question is also provided."})

            for msg in msgs:
                messages[0]["content"].append(
                    {"type": "text", "text": f"{msg['sender']}: " + f"{msg['text']}"})

            completion = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                temperature=TEMPERATURE,
                system=CLARIFY_SYSTEM_PROMPT,
                max_tokens=4096,
                messages=messages
            )

            print(''.join([block.text for block in completion.content]))

            self.clarify_handle_completion(
                ''.join([block.text for block in completion.content]))
        except Exception as e:
            self.handle_exception(e)

    def main_area_call_gpt4o(self, cell_contents):
        print("calling gpt...")

        messages = [
            {
                "role": "system",
                "content": [
                    {
                        "type": "text",
                        "text": MAIN_AREA_AGENT1
                    }
                ]
            },
            {
                "role": "user",
                "content": []
            }
        ]
        try:
            self.process_cells(cell_contents, messages[1], "GPT-4o")
            messages[1]["content"].append({"type": "text", "text": """[This is not a cell in the notebook]: Your response must be a single valid JSON object with three fields, \
                    "summary", "respond", and "cell". Note that you should escape special characters like new line. Reread the system prompt for details. \
                    In particular, you should revisit the last cell that has the "by user" tag. This cell contains the user query. You should help address it. \
                    Therefore, structure your response to help answer that query. Do not make your contribution more informative than is required, but ensure that the response \
                    addresses the intent in the question. It is possible that you, the LLM, might have already answered the user query, so you should pay close attention to what you may \
                    have already answered. If your previous answer has already addressed the user query, then set "respond" to false."""})

            completion = openai_client.chat.completions.create(
                model="gpt-4o-2024-08-06",
                temperature=TEMPERATURE,
                messages=messages
            )
            print("initial response:")
            print(completion.choices[0].message.content)
            print("*"*30)

            self.main_area_handle_completion(
                completion.choices[0].message.content, messages, cell_contents)
        except Exception as e:
            self.handle_exception(e)

    def main_area_call_claude(self, cell_contents):
        print("calling claude...")
        messages = [{"role": "user", "content": []}]
        try:
            self.process_cells(cell_contents, messages[0], "claude")

            messages[0]["content"].append({"type": "text", "text": """[This is not a cell in the notebook]: Your response must be a single valid JSON object with three fields, \
                    "summary", "respond", and "cell". Note that you should escape special characters like new line. Reread the system prompt for details. \
                    In particular, you should revisit the last cell that has the "by user" tag. This cell contains the user query. You should help address it. \
                    Therefore, structure your response to help answer that query. Do not make your contribution more informative than is required, but ensure that the response \
                    addresses the intent in the question. It is possible that you, the LLM, might have already answered the user query, so you should pay close attention to what you may \
                    have already answered. If your previous answer has already addressed the user query, then set "respond" to false."""})

            completion = anthropic_client.messages.create(
                model="claude-3-5-sonnet-20240620",
                temperature=TEMPERATURE,
                system=MAIN_AREA_AGENT1,
                max_tokens=4096,
                messages=messages
            )

            print(''.join([block.text for block in completion.content]))

            self.main_area_handle_completion(
                ''.join([block.text for block in completion.content]), messages, cell_contents)
        except Exception as e:
            self.handle_exception(e)

    def process_cell(self, cell, content_list, LLM, cell_index):
        # print(type(cell))
        if cell["cellType"] == "code":
            content_list.append(
                {"type": "text", "text": f"[Cell No. {cell_index}] -- code cell (by {cell['source']}) input:\n{cell['input']}"})
            for i, output in enumerate(cell["output"]):
                self.process_output(output, content_list, i, LLM)

        elif cell["cellType"] in ("markdown", "raw"):
            content_list.append(
                {"type": "text", "text": f"[Cell No. {cell_index}] -- {cell['cellType']} cell (by {cell['source']}):\n{cell['input']}"})

    def process_cells(self, cell_contents, model_msgs, model_name):
        for i, cell in enumerate(cell_contents):
            # print(type(cell))
            self.process_cell(cell, model_msgs["content"], model_name, i)

    def process_output(self, output, content_list, index, LLM):
        if "application/vnd.jupyter.stderr" in output:
            content = output["application/vnd.jupyter.stderr"]
            if index == 0:
                content = "code cell output: " + content[:20000]
            content_list.append({"type": "text", "text": content})

        elif "application/vnd.jupyter.stdout" in output:
            content = output["application/vnd.jupyter.stdout"]
            if index == 0:
                content = "code cell output: " + content[:20000]
            content_list.append({"type": "text", "text": content})

        elif "image/png" in output:
            content = output["image/png"]
            if LLM == "GPT-4o":
                if not content.startswith("data:image/png;base64,"):
                    content = "data:image/png;base64," + content
                if index == 0:
                    content_list.append(
                        {"type": "text", "text": "code cell output:"})
                content_list.append({"type": "image_url", "image_url": {
                                    "url": content, "detail": "high"}})
            elif LLM == "claude":
                if index == 0:
                    content_list.append(
                        {"type": "text", "text": "code cell output:"})
                content_list.append({"type": "image", "source": {
                                    "type": "base64", "media_type": "image/png", "data": content}})

        elif "text/plain" in output:
            content = output["text/plain"]
            if index == 0:
                content = "code cell output: " + content[:20000]
            content_list.append({"type": "text", "text": content})

    def claude_process_output(self, output, messages, i):
        if "application/vnd.jupyter.stderr" in output:
            content = output["application/vnd.jupyter.stderr"]
            if i == 0:
                content = "code cell output: " + content
            messages[0]["content"].append({"type": "text", "text": content})
        elif "application/vnd.jupyter.stdout" in output:
            content = output["application/vnd.jupyter.stdout"]
            if i == 0:
                content = "code cell output: " + content
            messages[0]["content"].append({"type": "text", "text": content})
        elif "image/png" in output:
            if i == 0:
                messages[0]["content"].append(
                    {"type": "text", "text": "code cell output:"})
            messages[0]["content"].append({"type": "image", "source": {
                                          "type": "base64", "media_type": "image/png", "data": output["image/png"]}})

        elif "text/plain" in output:
            content = output["text/plain"]
            if i == 0:
                content = "code cell output: " + content
            messages[0]["content"].append({"type": "text", "text": content})

    def main_area_handle_completion(self, completion_content, messages, cell_contents):
        llm_response = strip_extra_content(completion_content)

        agent2_3_history_gpt = [
            {"role": "assistant",
                "content": "Here is the initial response. Please critique it."},
            {"role": "assistant", "content": completion_content}
        ]
        agent2_3_history_claude = [
            {"type": "text", "text": "Here is the initial response. Please critique it."},
            {"type": "text", "text": completion_content}
        ]

        # Plan
        if RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "GPT-4o":
            plan_msgs = [{"role": "system", "content": [{"type": "text", "text": PLAN}]}, {
                "role": "user", "content": []}]
            self.process_cells(cell_contents, plan_msgs[1], "GPT-4o")
            plan_msgs.extend(agent2_3_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "claude":
            plan_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, plan_msgs[0], "claude")
            plan_msgs[0]["content"].extend(agent2_3_history_claude)

        # Code
        if RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "GPT-4o":
            code_msgs = [{"role": "system", "content": [{"type": "text", "text": CODE}]}, {
                "role": "user", "content": []}]
            self.process_cells(cell_contents, code_msgs[1], "GPT-4o")
            code_msgs.extend(agent2_3_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "claude":
            code_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, code_msgs[0], "claude")
            code_msgs[0]["content"].extend(agent2_3_history_claude)

        # Interpret
        if RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "GPT-4o":
            interpret_msgs = [{"role": "system", "content": [
                {"type": "text", "text": INTERPRET}]}, {"role": "user", "content": []}]
            self.process_cells(cell_contents, interpret_msgs[1], "GPT-4o")
            interpret_msgs.extend(agent2_3_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "claude":
            interpret_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, interpret_msgs[0], "claude")
            interpret_msgs[0]["content"].extend(agent2_3_history_claude)

        # Vis
        if RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "GPT-4o":
            vis_msgs = [{"role": "system", "content": [{"type": "text", "text": VIS}]}, {
                "role": "user", "content": []}]
            self.process_cells(cell_contents, vis_msgs[1], "GPT-4o")
            vis_msgs.extend(agent2_3_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "claude":
            vis_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, vis_msgs[0], "claude")
            vis_msgs[0]["content"].extend(agent2_3_history_claude)

        # Refiner2
        if RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "GPT-4o":
            refiner2_msgs = [{"role": "system", "content": [
                {"type": "text", "text": REFINER2}]}, {"role": "user", "content": []}]
            self.process_cells(cell_contents, refiner2_msgs[1], "GPT-4o")
            refiner2_msgs.extend(agent2_3_history_gpt)
        elif RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "claude":
            refiner2_msgs = [{"role": "user", "content": []}]
            self.process_cells(cell_contents, refiner2_msgs[0], "claude")
            refiner2_msgs[0]["content"].extend(agent2_3_history_claude)

        try:
            if RouteHandler.CONFIG["EDA_MULTI_AGENT"]:
                i = 1
                while i <= RouteHandler.CONFIG["EDA_MAX_ROUND"]:
                    ready = False

                    plan, code, vis, interpret = self.main_area_call_apis_in_parallel(
                        [plan_msgs, code_msgs, vis_msgs, interpret_msgs], [PLAN, CODE, VIS, INTERPRET])
                    critique = "Analysis Plan Critique: " + plan + "\n" + \
                        "Code Critique: " + code + "\n" + \
                        "Visualization Critique: " + vis + "\n" + \
                        "Interpretation and Summary Critique: " + interpret
                    print(critique)
                    if RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "GPT-4o":
                        plan_msgs.append(
                            {"role": "assistant", "content": critique})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "claude":
                        plan_msgs[0]["content"].append(
                            {"type": "text", "text": critique})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "GPT-4o":
                        code_msgs.append(
                            {"role": "assistant", "content": critique})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "claude":
                        code_msgs[0]["content"].append(
                            {"type": "text", "text": critique})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "GPT-4o":
                        vis_msgs.append(
                            {"role": "assistant", "content": critique})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "claude":
                        vis_msgs[0]["content"].append(
                            {"type": "text", "text": critique})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "GPT-4o":
                        interpret_msgs.append(
                            {"role": "assistant", "content": critique})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "claude":
                        interpret_msgs[0]["content"].append(
                            {"type": "text", "text": critique})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "GPT-4o":
                        refiner2_msgs.append(
                            {"role": "assistant", "content": critique})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "claude":
                        refiner2_msgs[0]["content"].append(
                            {"type": "text", "text": critique})
                    print("-"*30)
                    try:
                        _ready = True
                        for llm_response in (plan, code, vis, interpret):
                            response = strip_extra_content(llm_response)
                            response = json.loads(response)
                            _ready = _ready and response["response_ready"] and isinstance(
                                response["response_ready"], bool)
                            ready = _ready
                    except Exception as e:
                        print(
                            "An execption occurred in determining if ready: " + str(e))
                        ready = True

                    if RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "GPT-4o":
                        print("calling gpt4o")
                        refine = openai_client.chat.completions.create(
                            model="gpt-4o-2024-08-06",
                            temperature=TEMPERATURE,
                            messages=refiner2_msgs
                        )
                        refine = refine.choices[0].message.content
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "claude":
                        print("calling claude")
                        refine = anthropic_client.messages.create(
                            model="claude-3-5-sonnet-20240620",
                            temperature=TEMPERATURE,
                            system=REFINER2,
                            max_tokens=4096,
                            messages=refiner2_msgs
                        )
                        refine = ''.join(
                            [block.text for block in refine.content])
                    print("Refine:")
                    print(refine)
                    if RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "GPT-4o":
                        plan_msgs.append(
                            {"role": "assistant", "content": "Refiner: " + refine})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "claude":
                        plan_msgs[0]["content"].append(
                            {"type": "text", "text": "Refiner: " + refine})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "GPT-4o":
                        code_msgs.append(
                            {"role": "assistant", "content": "Refiner: " + refine})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "claude":
                        code_msgs[0]["content"].append(
                            {"type": "text", "text": "Refiner: " + refine})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "GPT-4o":
                        vis_msgs.append(
                            {"role": "assistant", "content": "Refiner: " + refine})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "claude":
                        vis_msgs[0]["content"].append(
                            {"type": "text", "text": "Refiner: " + refine})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "GPT-4o":
                        interpret_msgs.append(
                            {"role": "assistant", "content": "Refiner: " + refine})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "claude":
                        interpret_msgs[0]["content"].append(
                            {"type": "text", "text": "Refiner: " + refine})
                    if RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "GPT-4o":
                        refiner2_msgs.append(
                            {"role": "assistant", "content": "Refiner: " + refine})
                    elif RouteHandler.CONFIG["AGENT_MODELS"]["refiner2"] == "claude":
                        refiner2_msgs[0]["content"].append(
                            {"type": "text", "text": "Refiner: " + refine})
                    print("="*30)
                    llm_response = strip_extra_content(refine)
                    response = json.loads(llm_response)
                    if ready or i == RouteHandler.CONFIG["EDA_MAX_ROUND"]:
                        print("&"*30)
                        print("&"*30)
                        # self.finish(json.dumps(response))
                        self.finish(json.dumps(response))
                        break
                    i += 1
            else:
                response = json.loads(llm_response)
                if isinstance(response, dict) and 'respond' in response and 'cell' in response and 'summary' in response:
                    # data = response["cell"]
                    parsedResponse = response["cell"]
                    if isinstance(parsedResponse, dict) and 'cellType' in parsedResponse and 'content' in parsedResponse:
                        self.finish(json.dumps(response))
                else:
                    # throw error here
                    raise ValueError(
                        "Response does not contain required fields")
        except json.JSONDecodeError:
            self.set_status(400)
            self.finish(json.dumps(
                {"error": "Invalid JSON response from LLM"}))
        except ValueError as ve:
            self.set_status(400)
            self.finish(json.dumps({"error": str(ve)}))

    def clarify_handle_completion(self, completion_content):
        llm_response = strip_extra_content(completion_content)
        try:
            response = json.loads(llm_response)
            if isinstance(response, dict) and 'clarification' in response:
                self.finish(json.dumps(response))
            else:
                raise ValueError("Response does not contain required fields")
        except json.JSONDecodeError:
            self.set_status(400)
            self.finish(json.dumps(
                {"error": "Invalid JSON response from LLM"}))
        except ValueError as ve:
            self.set_status(400)
            self.finish(json.dumps({"error": str(ve)}))

    def handle_exception(self, exception):
        print("An error occurred:", str(exception))
        self.set_status(500)
        self.finish(json.dumps({"error": str(exception)}))

    def call_claude(self, msg, system_prompt, model="claude-3-5-sonnet-20240620", temp=TEMPERATURE, max_tokens=4096):
        print("calling claude")
        response = anthropic_client.messages.create(
            model=model,
            temperature=temp,
            system=system_prompt,
            max_tokens=max_tokens,
            messages=msg
        )
        return response

    def call_gpt(self, msg, system_prompt, model="gpt-4o-2024-08-06", temp=TEMPERATURE):
        print("calling gpt")
        response = openai_client.chat.completions.create(
            model=model,
            temperature=temp,
            messages=msg
        )
        return response

    def main_area_call_apis_in_parallel(self, msgs, system_prompts):
        with concurrent.futures.ThreadPoolExecutor() as executor:
            plan = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "GPT-4o" else self.call_claude, msgs[0], system_prompts[0])
            code = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "GPT-4o" else self.call_claude, msgs[1], system_prompts[1])
            vis = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "GPT-4o" else self.call_claude, msgs[2], system_prompts[2])
            interpret = executor.submit(
                self.call_gpt if RouteHandler.CONFIG["AGENT_MODELS"]["interpret"] == "GPT-4o" else self.call_claude, msgs[3], system_prompts[3])

            plan = plan.result()
            code = code.result()
            vis = vis.result()
            interpret = interpret.result()

            plan = plan.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"]["plan"] == "GPT-4o" else ''.join(
                [block.text for block in plan.content])
            code = code.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"]["code"] == "GPT-4o" else ''.join(
                [block.text for block in code.content])
            vis = vis.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"]["vis"] == "GPT-4o" else ''.join(
                [block.text for block in vis.content])
            interpret = interpret.choices[0].message.content if RouteHandler.CONFIG["AGENT_MODELS"][
                "interpret"] == "GPT-4o" else ''.join([block.text for block in interpret.content])

        return plan, code, vis, interpret


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    # Prepend the base_url so that it works in a JupyterHub setting
    route_pattern = url_path_join(base_url, "llm4eda", "hello")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)

    # Prepend the base_url so that it works in a JupyterHub setting
    doc_url = url_path_join(base_url, "llm4eda", "public")
    doc_dir = os.getenv(
        "JLAB_SERVER_EXAMPLE_STATIC_DIR",
        os.path.join(os.path.dirname(__file__), "public"),
    )
    handlers = [("{}/(.*)".format(doc_url),
                 StaticFileHandler, {"path": doc_dir})]
    web_app.add_handlers(host_pattern, handlers)
