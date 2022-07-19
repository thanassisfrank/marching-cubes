struct Uniform {
    pMat : mat4x4<f32>,
    mvMat : mat4x4<f32>,
};

struct VertexOut {
    @builtin(position) position : vec4<f32>,
    @location(0) normal : vec3<f32>,
    @location(1) eye : vec3<f32>,
    @location(2) worldPos : vec3<f32>,
};

struct Light {
    dir : vec3<f32>,
    color : vec3<f32>,
};

@group(0) @binding(0) var<uniform> u : Uniform;


@vertex
fn vertex_main(@location(0) position: vec3<f32>,
                @location(1) normal: vec3<f32>) -> VertexOut
{
    var out : VertexOut;
    var vert : vec4<f32> = u.mvMat * vec4<f32>(position, 1.0);
    
    out.position = u.pMat * vert;
    out.normal = normal;
    out.eye = -vec3<f32>(vert.xyz);
    out.worldPos = position;

    return out;
}

@fragment
fn fragment_main(
    @builtin(front_facing) frontFacing : bool, 
    data: VertexOut
) 
    -> @location(0) vec4<f32>
{
    
    var light1 : Light;
    light1.dir = vec3<f32>(0.0, 0.0, -1.0);
    light1.color = vec3<f32>(1.0);

    var diffuseColor = vec3<f32>(0.1, 0.7, 0.6);
    let specularColor = vec3<f32>(1.0);
    let shininess : f32 = 50.0;

    var E = normalize(data.eye);
    //var N = normalize(data.normal);
    
    // extract the normal from the view-space orientation
    var N = -normalize(cross(dpdx(data.eye), dpdy(data.eye)));
    // var N = vec3<f32>(.0,.0,.0);

    if (frontFacing) {
        diffuseColor = vec3<f32>(0.7, 0.2, 0.2);
        //N = -N;
    }
    
    var diffuseFac = max(dot(-N, light1.dir), 0.0);
    
    var diffuse : vec3<f32>;
    var specular : vec3<f32>;
    var ambient : vec3<f32> = diffuseColor*0.3;
    
    var reflected : vec3<f32>;

    if (diffuseFac > 0.0) {
        diffuse = diffuseColor*light1.color*diffuseFac;

        reflected = reflect(light1.dir, N);
        var specularFac : f32 = pow(max(dot(reflected, E), 0.0), shininess);
        specular = specularColor*light1.color*specularFac;
    }
    var matCol = diffuse + specular + ambient;
    var fogCol = vec3<f32>(0.9, 0.9, 0.9);
    return vec4<f32>(mix(fogCol, matCol, data.position.z), 1.0);
    //return vec4<f32>(N, 1.0);
}   