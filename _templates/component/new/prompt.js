const inputValidator = (input) => {
  if (input !== "") {
    return true;
  }
};

module.exports = {
  prompt: ({ inquirer, _args }) => {
    const questions = [
      {
        type: "input",
        name: "name",
        message: "コンポーネントの名前を指定してください。ex) Header",
        validate: inputValidator,
      },
      {
        type: "select",
        name: "path",
        message: "src/components以下のパスを指定してください。",
        choices: ["elements"],
      },
    ];
    return inquirer.prompt(questions).then((answers) => {
      const { name } = answers;

      const componentName = name.charAt(0).toUpperCase() + name.slice(1);
      return { ...answers, componentName };
    });
  },
};
