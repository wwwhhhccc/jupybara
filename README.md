To get started:

```bash
# clone the repository
git clone git@github.com:wwwhhhccc/jupybara.git jupybara
cd jupybara

# create a new environment
conda env create

# activate the environment
conda activate jupybara

touch yarn.lock

# install the extension in editable mode
python -m pip install -e .

# install your development version of the extension with JupyterLab
jupyter labextension develop . --overwrite

# build the TypeScript source after making changes
jlpm run build

# start JupyterLab
jupyter lab
```

Once installed, go to llm4eda, open .env, and input your OpenAI and Anthropic API keys.

Note that you will need to create a folder named "images" in the same directory as your Jupyter Notebook, since Jupybara will store all images generated there. A future version of Jupybara should automate this.

This extension works for **JupyterLab 4.0 or later**.