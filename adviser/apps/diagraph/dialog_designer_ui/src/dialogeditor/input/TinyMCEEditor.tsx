import { FC, ReactElement, useState } from 'react';
import 'tinymce/tinymce';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';
import 'tinymce/plugins/paste';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/image';
import 'tinymce/plugins/table';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/print';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/media';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';
import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/ui/oxide/content.min.css';
import 'tinymce/skins/content/default/content.min.css';
import { Editor } from '@tinymce/tinymce-react';
import React from 'react';

// tinymce.init({language: "de_DE",
//               language_url: "/langs/de.js",
//               directionality :"ltr"});

interface TinyMCEProps {
    initialValue?: string,
    onValueChange?: (newValue: string) => void,
    height?: number | string,
    menubar?: boolean
}

const TinyMCEEditor: FC<TinyMCEProps> = (props: TinyMCEProps): ReactElement => {
    // note that skin and content_css is disabled to avoid the normal
    // loading process and is instead loaded as a string via content_style
    // eslint-disable-next-line
    const [value, setValue] = useState(props.initialValue?? '');

    return <Editor
        init={{
          auto_focus: true,
          height: props.height,
          menubar: props.menubar,
          skin: false,
          extended_valid_elements : "svg[*],path[*]",
          // content_css: false,
          // content_style: [contentCss, contentUiCss].join('\n'),
          plugins: [
            'advlist autolink lists link image charmap print preview anchor',
            'searchreplace visualblocks code fullscreen',
            'insertdatetime media table paste help wordcount'
            ],
          language: "en",
          // language_url: "/static/dialogmanagement/dialogdesigner/langs/de.js",
          directionality :"ltr",
          toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | image | help',
          content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
          images_upload_url: '/upload_image/'
        }}
        initialValue={props.initialValue}
        onEditorChange={(newValue: string, editor: any) => { setValue(newValue); props.onValueChange!(newValue); }}
      />;
};

TinyMCEEditor.defaultProps = {
  initialValue: '',
  height: '500px',
  menubar: true,
  onValueChange: (newValue: string) => {}
};

export default TinyMCEEditor;