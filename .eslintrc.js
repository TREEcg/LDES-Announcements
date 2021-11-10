module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: [
        'eslint-plugin-tsdoc',
        'eslint-plugin-import',
        'eslint-plugin-unused-imports',    ],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: 'tsconfig.json',
    },
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: {
                alwaysTryTypes: true, // always try to resolve types under `<root>@types` directory even it doesn't contain any source code, like `@types/rdf-js`
            },
        },
    },
    extends: [
        'es/node',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:import/typescript',
    ],
    rules: {
        "multiline-comment-style": "off",
        "no-use-before-define": "off",
        "func-style": "off",
        'prefer-named-capture-group':'off',
        "lines-around-comment": "off",
        "padding-line-between-statements": "off",
        '@typescript-eslint/no-use-before-define':'off',
        "@typescript-eslint/space-before-function-paren": "off",
        // Import
        'import/order': [
            'error',
            {
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
        'import/no-unused-modules': 'off',
        'unused-imports/no-unused-imports-ts': 'error',
        'import/no-extraneous-dependencies': 'error',
    }
};
